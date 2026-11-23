import * as Linking from 'expo-linking';
import { CreateManagedUserResult } from '../../../domain/repositories';
import { Usuario } from '../../../domain/entities';
import { CreateUserInput } from '../../../domain/validators/userSchema';
import { supabaseClient } from '../../../infrastructure/supabase/supabaseClient';
import { mapUsuarioRow, UsuarioRow } from '../../mappers/mappers';

function extractAuthParamsFromUrl(url: string): Record<string, string> {
  const params: Record<string, string> = {};
  const queryMatch = url.split('?')[1]?.split('#')[0];
  const hashMatch = url.split('#')[1];

  for (const part of [queryMatch, hashMatch]) {
    if (!part) continue;
    for (const pair of part.split('&')) {
      const [rawKey, rawVal] = pair.split('=');
      if (rawKey && rawVal !== undefined) {
        params[decodeURIComponent(rawKey)] = decodeURIComponent(rawVal);
      }
    }
  }
  return params;
}

export class AuthRemoteDS {
  async signInWithPassword(email: string, password: string): Promise<Usuario> {
    const { data, error } = await supabaseClient.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });

    if (error || !data.user) {
      if (error?.message.toLowerCase().includes('email not confirmed')) {
        throw new Error(
          'Su correo electrónico aún no ha sido verificado. Revise su bandeja de entrada y abra el enlace de confirmación.'
        );
      }
      throw new Error('Correo o contraseña incorrectos. Verifique sus credenciales.');
    }

    if (!data.user.email_confirmed_at) {
      await supabaseClient.auth.signOut();
      throw new Error(
        'Debe confirmar su correo electrónico mediante el enlace enviado antes de ingresar.'
      );
    }

    const profile = await this.fetchProfileById(data.user.id);
    if (!profile || !profile.activo) {
      await supabaseClient.auth.signOut();
      throw new Error('Su cuenta no está autorizada o se encuentra desactivada.');
    }

    // ADR-01: sincronizar indicador de clave temporal con metadatos de Auth
    const metaMustChange = data.user.user_metadata?.must_change_password;
    return {
      ...profile,
      mustChangePassword: Boolean(profile.mustChangePassword || metaMustChange === true),
    };
  }

  async signOut(): Promise<void> {
    // ADR-07: cerrar suscripciones Realtime activas al cerrar sesión
    await supabaseClient.removeAllChannels();
    await supabaseClient.auth.signOut();
  }

  async getCurrentUser(): Promise<Usuario | null> {
    const { data: sessionData } = await supabaseClient.auth.getSession();
    const sessionUser = sessionData.session?.user;
    if (!sessionUser || !sessionUser.email_confirmed_at) {
      return null;
    }

    const profile = await this.fetchProfileById(sessionUser.id);
    if (!profile || !profile.activo) return null;

    const metaMustChange = sessionUser.user_metadata?.must_change_password;
    return {
      ...profile,
      mustChangePassword: Boolean(profile.mustChangePassword || metaMustChange === true),
    };
  }

  async fetchProfileById(userId: string): Promise<Usuario | null> {
    const { data, error } = await supabaseClient
      .from('usuarios')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (error || !data) return null;
    return mapUsuarioRow(data as UsuarioRow);
  }

  async updatePassword(newPassword: string, isFirstLogin: boolean): Promise<void> {
    const { error: authErr } = await supabaseClient.auth.updateUser({
      password: newPassword,
      data: { must_change_password: false },
    });

    if (authErr) {
      throw new Error(authErr.message || 'No se pudo actualizar la contraseña');
    }

    if (isFirstLogin) {
      const { error: rpcErr } = await supabaseClient.rpc('completar_primer_cambio_clave');
      if (rpcErr) {
        throw new Error('Contraseña actualizada en Auth, pero falló actualizar el perfil.');
      }
    }
  }

  async requestPasswordRecovery(email: string): Promise<void> {
    const cleanEmail = email.trim().toLowerCase();

    // RF-04 & ADR-02: solo permitir recuperación a correos previamente verificados
    const { data: isVerified, error: checkErr } = await supabaseClient.rpc(
      'correo_esta_verificado',
      { p_email: cleanEmail }
    );

    if (checkErr) {
      throw new Error('No se pudo validar el estado del correo. Verifique su conexión.');
    }
    if (!isVerified) {
      throw new Error(
        'Este correo no está registrado o aún no ha sido verificado. Solo los correos confirmados pueden recuperar su contraseña.'
      );
    }

    const { error } = await supabaseClient.auth.resetPasswordForEmail(cleanEmail, {
      redirectTo: Linking.createURL('nueva-clave'),
    });

    if (error) {
      throw new Error(error.message || 'No se pudo enviar el enlace de recuperación');
    }
  }

  async createManagedUser(input: CreateUserInput): Promise<CreateManagedUserResult> {
    const { data, error } = await supabaseClient.functions.invoke('create-managed-user', {
      body: {
        cedula: input.cedula,
        nombres: input.nombres,
        apellidos: input.apellidos,
        telefono: input.telefono,
        email: input.email,
        redirectTo: Linking.createURL('primer-ingreso'),
        rol: input.rol,
        es_externo: Boolean(input.esExterno),
        recinto_id: input.recintoId ?? null,
        mesa_ids: input.mesaIds ?? [],
      },
    });

    if (error) {
      let msg = error.message;
      try {
        const ctx = (error as { context?: { json?: () => Promise<{ error?: string }> } }).context;
        const parsed = await ctx?.json?.();
        if (parsed?.error) msg = parsed.error;
      } catch {
        // Mantener mensaje original
      }
      throw new Error(msg || 'No se pudo crear la cuenta');
    }

    if (data?.error) {
      throw new Error(String(data.error));
    }

    return {
      userId: String(data.user_id),
      email: String(data.email),
      tempPassword: String(data.temp_password),
      message: String(data.message ?? 'Cuenta creada correctamente'),
      warning: data.warning ? String(data.warning) : undefined,
    };
  }

  async handleDeepLinkUrl(url: string): Promise<'RECOVERY' | 'VERIFIED' | 'NONE'> {
    const params = extractAuthParamsFromUrl(url);

    if (params.code) {
      const { error } = await supabaseClient.auth.exchangeCodeForSession(params.code);
      if (error) return 'NONE';
      return url.includes('nueva-clave') ? 'RECOVERY' : 'VERIFIED';
    }

    if (params.access_token && params.refresh_token) {
      const { error } = await supabaseClient.auth.setSession({
        access_token: params.access_token,
        refresh_token: params.refresh_token,
      });
      if (error) return 'NONE';

      if (params.type === 'recovery' || url.includes('nueva-clave')) {
        return 'RECOVERY';
      }
      return 'VERIFIED';
    }

    return 'NONE';
  }
}