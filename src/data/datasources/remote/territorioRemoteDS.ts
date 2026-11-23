import {
  Candidato,
  DignidadElectoral,
  EstadoAvanceMesa,
  GeneroMesa,
  Mesa,
  Organizacion,
  Recinto,
  Usuario,
} from '../../../domain/entities';
import { CreateRecintoInput } from '../../../domain/validators/userSchema';
import { supabaseClient } from '../../../infrastructure/supabase/supabaseClient';
import {
  CandidatoRow,
  mapCandidatoRow,
  mapOrganizacionRow,
  mapRecintoRow,
  mapUsuarioRow,
  OrganizacionRow,
  RecintoRow,
  unwrapOne,
  UsuarioRow,
} from '../../mappers/mappers';

function calcularAvance(tieneAlcaldia: boolean, tienePrefectura: boolean): EstadoAvanceMesa {
  if (tieneAlcaldia && tienePrefectura) return 'COMPLETA';
  if (tieneAlcaldia || tienePrefectura) return 'PARCIAL';
  return 'PENDIENTE';
}

export class TerritorioRemoteDS {
  async getOrganizacionesYCandidatos(): Promise<{
    organizaciones: Organizacion[];
    candidatos: Candidato[];
  }> {
    const [orgRes, candRes] = await Promise.all([
      supabaseClient.from('organizaciones').select('*').order('numero_lista', { ascending: true }),
      supabaseClient.from('candidatos').select('*'),
    ]);

    if (orgRes.error) throw new Error(orgRes.error.message);
    if (candRes.error) throw new Error(candRes.error.message);

    return {
      organizaciones: (orgRes.data as OrganizacionRow[]).map(mapOrganizacionRow),
      candidatos: (candRes.data as CandidatoRow[]).map(mapCandidatoRow),
    };
  }

  async getRecintosJurisdiccion(): Promise<Recinto[]> {
    const [recRes, mesasRes, actasRes] = await Promise.all([
      supabaseClient
        .from('recintos')
        .select('*, coordinador:usuarios!recintos_coordinador_id_fkey(nombres, apellidos)')
        .order('nombre', { ascending: true }),
      supabaseClient.from('mesas').select('id, recinto_id'),
      supabaseClient.from('actas').select('mesa_id, dignidad'),
    ]);

    if (recRes.error) throw new Error(recRes.error.message);

    const actasPorMesa = new Map<string, Set<DignidadElectoral>>();
    for (const a of (actasRes.data ?? []) as { mesa_id: string; dignidad: DignidadElectoral }[]) {
      const set = actasPorMesa.get(a.mesa_id) ?? new Set<DignidadElectoral>();
      set.add(a.dignidad);
      actasPorMesa.set(a.mesa_id, set);
    }

    const mesasPorRecinto = new Map<string, string[]>();
    for (const m of (mesasRes.data ?? []) as { id: string; recinto_id: string }[]) {
      const list = mesasPorRecinto.get(m.recinto_id) ?? [];
      list.push(m.id);
      mesasPorRecinto.set(m.recinto_id, list);
    }

    return (recRes.data as RecintoRow[]).map((row) => {
      const base = mapRecintoRow(row);
      const mesasIds = mesasPorRecinto.get(row.id) ?? [];
      let completas = 0;
      let parciales = 0;

      for (const mId of mesasIds) {
        const digs = actasPorMesa.get(mId);
        if (digs?.size === 2) completas++;
        else if (digs?.size === 1) parciales++;
      }

      return {
        ...base,
        totalMesas: mesasIds.length,
        mesasCompletas: completas,
        mesasParciales: parciales,
      };
    });
  }

  async createRecinto(input: CreateRecintoInput): Promise<Recinto> {
    const { data: recintoData, error } = await supabaseClient
      .from('recintos')
      .insert({
        provincia: 'Pichincha',
        canton: 'Quito',
        parroquia: input.parroquia,
        nombre: input.nombre,
        latitud: input.latitud,
        longitud: input.longitud,
      })
      .select('*')
      .single();

    if (error || !recintoData) {
      throw new Error(error?.message ?? 'No se pudo registrar el recinto electoral');
    }

    // Crear automáticamente las mesas (JRV) solicitadas alternando género M/F
    const mesasToInsert = Array.from({ length: input.cantidadMesas }, (_, i) => ({
      recinto_id: recintoData.id,
      numero_jrv: i + 1,
      genero: (i % 2 === 0 ? 'M' : 'F') as GeneroMesa,
    }));

    const { error: mesasErr } = await supabaseClient.from('mesas').insert(mesasToInsert);
    if (mesasErr) throw new Error(mesasErr.message);

    // Inicializar totales_escrutinio en 0 para el nuevo recinto (ADR-11)
    const { data: orgs } = await supabaseClient.from('organizaciones').select('id');
    if (orgs && orgs.length > 0) {
      // Los totales se recalcularán con el trigger al subir la primera acta
    }

    return {
      ...mapRecintoRow(recintoData as RecintoRow),
      totalMesas: input.cantidadMesas,
      mesasCompletas: 0,
      mesasParciales: 0,
    };
  }

  async asignarCoordinadorRecinto(recintoId: string, coordinadorId: string): Promise<void> {
    // RF-07: UNIQUE(coordinador_id) impide asignar un coordinador ya asignado a otro recinto
    const { error } = await supabaseClient
      .from('recintos')
      .update({ coordinador_id: coordinadorId })
      .eq('id', recintoId);

    if (error) {
      if (error.code === '23505') {
        throw new Error(
          'Este coordinador ya está asignado a otro recinto electoral. Cada recinto debe tener un coordinador exclusivo.'
        );
      }
      throw new Error(error.message);
    }
  }

  async getCoordinadoresRecinto(): Promise<Usuario[]> {
    const { data, error } = await supabaseClient
      .from('usuarios')
      .select('*')
      .eq('rol', 'RECINTO')
      .eq('activo', true)
      .order('apellidos', { ascending: true });

    if (error) throw new Error(error.message);
    return (data as UsuarioRow[]).map(mapUsuarioRow);
  }

  async getMiRecinto(): Promise<Recinto | null> {
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabaseClient
      .from('recintos')
      .select('*')
      .eq('coordinador_id', user.id)
      .maybeSingle();

    if (error || !data) return null;
    return mapRecintoRow(data as RecintoRow);
  }

  async getMesasMiRecinto(): Promise<Mesa[]> {
    const recinto = await this.getMiRecinto();
    if (!recinto) return [];

    const [mesasRes, asigRes, actasRes] = await Promise.all([
      supabaseClient
        .from('mesas')
        .select('*')
        .eq('recinto_id', recinto.id)
        .order('numero_jrv', { ascending: true }),
      supabaseClient
        .from('asignaciones_veedores')
        .select('mesa_id, veedor_id, veedor:usuarios!asignaciones_veedores_veedor_id_fkey(nombres, apellidos)')
        .eq('activa', true),
      supabaseClient.from('actas').select('mesa_id, dignidad'),
    ]);

    if (mesasRes.error) throw new Error(mesasRes.error.message);

    const asigMap = new Map<string, { veedorId: string; nombre: string }>();
    for (const row of (asigRes.data ?? []) as Array<{
      mesa_id: string;
      veedor_id: string;
      veedor: { nombres: string; apellidos: string } | { nombres: string; apellidos: string }[] | null;
    }>) {
      const v = unwrapOne(row.veedor);
      asigMap.set(row.mesa_id, {
        veedorId: row.veedor_id,
        nombre: v ? `${v.nombres} ${v.apellidos}` : 'Veedor asignado',
      });
    }

    const actasMap = new Map<string, Set<DignidadElectoral>>();
    for (const a of (actasRes.data ?? []) as { mesa_id: string; dignidad: DignidadElectoral }[]) {
      const set = actasMap.get(a.mesa_id) ?? new Set<DignidadElectoral>();
      set.add(a.dignidad);
      actasMap.set(a.mesa_id, set);
    }

    return (mesasRes.data ?? []).map((m) => {
      const asig = asigMap.get(m.id);
      const digs = actasMap.get(m.id);
      const hasAlc = Boolean(digs?.has('ALCALDIA'));
      const hasPref = Boolean(digs?.has('PREFECTURA'));
      return {
        id: m.id,
        recintoId: m.recinto_id,
        recintoNombre: recinto.nombre,
        recintoLatitud: recinto.latitud,
        recintoLongitud: recinto.longitud,
        numeroJrv: Number(m.numero_jrv),
        genero: m.genero as GeneroMesa,
        veedorActivoId: asig?.veedorId ?? null,
        veedorActivoNombre: asig?.nombre ?? null,
        estadoAlcaldia: hasAlc ? 'ENVIADO' : 'PENDIENTE',
        estadoPrefectura: hasPref ? 'ENVIADO' : 'PENDIENTE',
        avance: calcularAvance(hasAlc, hasPref),
      };
    });
  }

  async getVeedoresMiRecinto(): Promise<Usuario[]> {
    const { data, error } = await supabaseClient
      .from('usuarios')
      .select('*')
      .eq('rol', 'VEEDOR')
      .eq('activo', true)
      .order('apellidos', { ascending: true });

    if (error) throw new Error(error.message);
    return (data as UsuarioRow[]).map(mapUsuarioRow);
  }

  async reasignarMesaVeedor(mesaId: string, nuevoVeedorId: string): Promise<void> {
    const { error } = await supabaseClient.rpc('reasignar_mesa_veedor', {
      p_mesa_id: mesaId,
      p_nuevo_veedor_id: nuevoVeedorId,
    });
    if (error) throw new Error(error.message);
  }

  async getMesasAsignadasVeedor(veedorId: string): Promise<Mesa[]> {
    const { data, error } = await supabaseClient
      .from('asignaciones_veedores')
      .select(
        'mesa:mesas(id, recinto_id, numero_jrv, genero, recinto:recintos(nombre, latitud, longitud))'
      )
      .eq('veedor_id', veedorId)
      .eq('activa', true);

    if (error) throw new Error(error.message);

    const mesas: Mesa[] = [];
    for (const row of data ?? []) {
      const mesa = unwrapOne(
        row.mesa as unknown as {
          id: string;
          recinto_id: string;
          numero_jrv: number;
          genero: GeneroMesa;
          recinto:
            | { nombre: string; latitud: number; longitud: number }
            | { nombre: string; latitud: number; longitud: number }[]
            | null;
        }
      );
      if (!mesa) continue;
      const rec = unwrapOne(mesa.recinto);
      mesas.push({
        id: mesa.id,
        recintoId: mesa.recinto_id,
        recintoNombre: rec?.nombre ?? 'Recinto asignado',
        recintoLatitud: Number(rec?.latitud ?? 0),
        recintoLongitud: Number(rec?.longitud ?? 0),
        numeroJrv: Number(mesa.numero_jrv),
        genero: mesa.genero,
        veedorActivoId: veedorId,
      });
    }

    mesas.sort((a, b) => a.numeroJrv - b.numeroJrv);

    if (mesas.length > 0) {
      const { data: actasData } = await supabaseClient
        .from('actas')
        .select('mesa_id, dignidad')
        .in('mesa_id', mesas.map((m) => m.id));

      const actasMap = new Map<string, Set<DignidadElectoral>>();
      for (const a of (actasData ?? []) as { mesa_id: string; dignidad: DignidadElectoral }[]) {
        const set = actasMap.get(a.mesa_id) ?? new Set<DignidadElectoral>();
        set.add(a.dignidad);
        actasMap.set(a.mesa_id, set);
      }

      for (const m of mesas) {
        const digs = actasMap.get(m.id);
        const hasAlc = Boolean(digs?.has('ALCALDIA'));
        const hasPref = Boolean(digs?.has('PREFECTURA'));
        m.estadoAlcaldia = hasAlc ? 'ENVIADO' : 'PENDIENTE';
        m.estadoPrefectura = hasPref ? 'ENVIADO' : 'PENDIENTE';
        m.avance = calcularAvance(hasAlc, hasPref);
      }
    }

    return mesas;
  }
}