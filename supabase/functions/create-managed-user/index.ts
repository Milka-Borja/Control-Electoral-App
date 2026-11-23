// @ts-nocheck
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function validarCedulaEcuatoriana(cedula: string): boolean {
  if (!/^[0-9]{10}$/.test(cedula)) return false;
  const provincia = parseInt(cedula.substring(0, 2), 10);
  if ((provincia < 1 || provincia > 24) && provincia !== 30) return false;
  const tercerDigito = parseInt(cedula[2], 10);
  if (tercerDigito >= 6) return false;

  const coef = [2, 1, 2, 1, 2, 1, 2, 1, 2];
  let suma = 0;
  for (let i = 0; i < 9; i++) {
    let val = parseInt(cedula[i], 10) * coef[i];
    if (val >= 10) val -= 9;
    suma += val;
  }
  const digitoEsperado = (10 - (suma % 10)) % 10;
  return digitoEsperado === parseInt(cedula[9], 10);
}

function generarClaveTemporal(): string {
  const random = crypto.getRandomValues(new Uint32Array(1))[0].toString(36).slice(-4).toUpperCase();
  return `Acp${random}#26`;
}

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return jsonResponse({ error: 'Token de autenticación requerido' }, 401);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // Cliente autenticado para verificar quién invoca
    const callerClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user: callerAuth }, error: authErr } = await callerClient.auth.getUser();
    if (authErr || !callerAuth) return jsonResponse({ error: 'Sesión inválida' }, 401);

    // Cliente admin (solo vive en el servidor — RNF-02)
    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: callerProfile, error: profErr } = await admin
      .from('usuarios')
      .select('id, rol, activo')
      .eq('id', callerAuth.id)
      .single();

    if (profErr || !callerProfile || !callerProfile.activo) {
      return jsonResponse({ error: 'Usuario invocador no autorizado' }, 403);
    }

    const payload = await req.json();
    const cedula = String(payload.cedula ?? '').trim();
    const nombres = String(payload.nombres ?? '').trim();
    const apellidos = String(payload.apellidos ?? '').trim();
    const telefono = String(payload.telefono ?? '').trim();
    const email = String(payload.email ?? '').trim().toLowerCase();
    const rolDestino = String(payload.rol ?? '').trim().toUpperCase();
    const esExterno = Boolean(payload.es_externo ?? false);
    const recintoId: string | null = payload.recinto_id ?? null;
    const mesaIds: string[] = Array.isArray(payload.mesa_ids) ? payload.mesa_ids : [];

    // 1. Validar jerarquía estricta (RF-01)
    if (callerProfile.rol === 'PROVINCIAL' && rolDestino !== 'RECINTO') {
      return jsonResponse({ error: 'El coordinador provincial solo puede crear coordinadores de recinto' }, 403);
    }
    if (callerProfile.rol === 'RECINTO' && rolDestino !== 'VEEDOR') {
      return jsonResponse({ error: 'El coordinador de recinto solo puede crear veedores' }, 403);
    }
    if (callerProfile.rol === 'VEEDOR') {
      return jsonResponse({ error: 'Los veedores no tienen permiso para crear cuentas' }, 403);
    }

    // 2. Validar datos personales (RF-02)
    if (!validarCedulaEcuatoriana(cedula)) {
      return jsonResponse({ error: 'Cédula ecuatoriana inválida (dígito verificador incorrecto)' }, 400);
    }
    if (nombres.length < 2 || apellidos.length < 2) {
      return jsonResponse({ error: 'Nombres y apellidos son obligatorios' }, 400);
    }
    if (!/^09[0-9]{8}$/.test(telefono)) {
      return jsonResponse({ error: 'El teléfono debe tener 10 dígitos ecuatorianos (ej. 0991234567)' }, 400);
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return jsonResponse({ error: 'Correo electrónico inválido' }, 400);
    }

    // 3. Validar duplicidad antes de crear en Auth
    const { data: duplicado } = await admin
      .from('usuarios')
      .select('id, cedula, email')
      .or(`cedula.eq.${cedula},email.eq.${email}`)
      .maybeSingle();

    if (duplicado) {
      return jsonResponse(
        { error: duplicado.cedula === cedula ? 'La cédula ya está registrada' : 'El correo ya está registrado' },
        409
      );
    }

    // 4. Si es RECINTO creando veedor y pasa mesaIds, validar que pertenezcan a su recinto
    if (callerProfile.rol === 'RECINTO' && mesaIds.length > 0) {
      const { data: miRecinto } = await admin
        .from('recintos')
        .select('id')
        .eq('coordinador_id', callerProfile.id)
        .maybeSingle();

      if (!miRecinto) {
        return jsonResponse({ error: 'No tienes un recinto asignado' }, 403);
      }

      const { count } = await admin
        .from('mesas')
        .select('id', { count: 'exact', head: true })
        .eq('recinto_id', miRecinto.id)
        .in('id', mesaIds);

      if (count !== mesaIds.length) {
        return jsonResponse({ error: 'Una o más mesas no pertenecen a tu recinto' }, 403);
      }
    }

    // 5. Crear la cuenta sin confirmar y enviar el enlace único de confirmación (ADR-01, ADR-02)
    const tempPassword = generarClaveTemporal();
    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: false,
      user_metadata: {
        must_change_password: true,
        rol: rolDestino,
        nombres,
        apellidos,
      },
    });

    if (createErr || !created?.user) {
      return jsonResponse({ error: createErr?.message ?? 'No se pudo crear la cuenta' }, 400);
    }

    const newUserId = created.user.id;
    const { error: confirmationErr } = await admin.auth.admin.resend({
      type: 'signup',
      email,
      options: {
        emailRedirectTo:
          'https://milka-borja.github.io/Control-Electoral-App/auth-callback.html?flow=verificado',
      },
    });

    if (confirmationErr) {
      await admin.auth.admin.deleteUser(newUserId);
      return jsonResponse(
        { error: confirmationErr.message || 'No se pudo enviar el enlace de confirmación' },
        500
      );
    }

    // 6. Insertar perfil en public.usuarios
    const { error: insertErr } = await admin.from('usuarios').insert({
      id: newUserId,
      cedula,
      nombres,
      apellidos,
      telefono,
      email,
      rol: rolDestino,
      must_change_password: true,
      es_externo: esExterno,
      activo: true,
      created_by: callerProfile.id,
    });

    if (insertErr) {
      await admin.auth.admin.deleteUser(newUserId);
      return jsonResponse({ error: insertErr.message }, 400);
    }

    // 7. Asignación opcional inmediata de recinto (RF-07)
    if (rolDestino === 'RECINTO' && recintoId) {
      const { error: recErr } = await admin
        .from('recintos')
        .update({ coordinador_id: newUserId })
        .eq('id', recintoId)
        .is('coordinador_id', null);

      if (recErr) {
        return jsonResponse({
          user_id: newUserId,
          temp_password: tempPassword,
          warning: 'Usuario creado y correo enviado, pero el recinto ya tenía coordinador asignado.',
        }, 201);
      }
    }

    // 8. Asignación / reemplazo inmediato de mesas (RF-08, RF-20, S-05)
    if (rolDestino === 'VEEDOR' && mesaIds.length > 0) {
      await admin
        .from('asignaciones_veedores')
        .update({ activa: false, fecha_revocacion: new Date().toISOString() })
        .in('mesa_id', mesaIds)
        .eq('activa', true);

      const asignaciones = mesaIds.map((mesaId) => ({
        mesa_id: mesaId,
        veedor_id: newUserId,
        asignado_por: callerProfile.id,
        activa: true,
      }));
      await admin.from('asignaciones_veedores').insert(asignaciones);
    }

    return jsonResponse(
      {
        user_id: newUserId,
        email,
        rol: rolDestino,
        temp_password: tempPassword,
        message: 'Cuenta creada. Se envió el enlace de confirmación al correo registrado.',
      },
      201
    );
  } catch (err) {
    return jsonResponse({ error: err instanceof Error ? err.message : 'Error interno' }, 500);
  }
});