import * as FileSystem from 'expo-file-system/legacy';
import {
  Acta,
  ActaAuditoria,
  AvanceRecinto,
  ConflictoActa,
  DignidadElectoral,
  ExitPollResumen,
  GeneroMesa,
  ResultadoCandidato,
  Voto,
} from '../../../domain/entities';
import { supabaseClient } from '../../../infrastructure/supabase/supabaseClient';
import { unwrapOne } from '../../mappers/mappers';

const BUCKET_EVIDENCIAS = 'actas-evidencias';
const BASE64_CHARS =
  'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

function base64ToUint8Array(base64: string): Uint8Array {
  const clean = base64.replace(/[^A-Za-z0-9+/=]/g, '');
  let padding = 0;
  if (clean.endsWith('==')) padding = 2;
  else if (clean.endsWith('=')) padding = 1;

  const byteLength = (clean.length * 3) / 4 - padding;
  const bytes = new Uint8Array(byteLength);

  let byteIdx = 0;
  for (let i = 0; i < clean.length; i += 4) {
    const c1 = BASE64_CHARS.indexOf(clean[i]);
    const c2 = BASE64_CHARS.indexOf(clean[i + 1]);
    const c3 = BASE64_CHARS.indexOf(clean[i + 2]);
    const c4 = BASE64_CHARS.indexOf(clean[i + 3]);
    const triplet = (c1 << 18) | (c2 << 12) | ((c3 & 63) << 6) | (c4 & 63);

    if (byteIdx < byteLength) bytes[byteIdx++] = (triplet >> 16) & 255;
    if (byteIdx < byteLength) bytes[byteIdx++] = (triplet >> 8) & 255;
    if (byteIdx < byteLength) bytes[byteIdx++] = triplet & 255;
  }
  return bytes;
}

export interface UpsertActaRpcResponse {
  status: 'CREATED' | 'UPDATED' | 'IDEMPOTENT_OK' | 'CONFLICT' | 'CONFLICT_ALREADY_RECORDED';
  acta_id?: string;
  version?: number;
  server_version?: number;
}

export class ActaRemoteDS {
  async uploadEvidencePhoto(
    localUri: string,
    mesaId: string,
    dignidad: DignidadElectoral,
    clientUuid: string
  ): Promise<string> {
    // Ruta obligatoria para política RLS Storage (002_hardening_rls_y_auth.sql)
    const storagePath = `${mesaId}/${dignidad}/${clientUuid}.jpg`;

    const base64 = await FileSystem.readAsStringAsync(localUri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    const bytes = base64ToUint8Array(base64);

    const { error } = await supabaseClient.storage
      .from(BUCKET_EVIDENCIAS)
      .upload(storagePath, bytes, {
        contentType: 'image/jpeg',
        upsert: true,
      });

    if (error) {
      throw new Error(`No se pudo subir la fotografía del acta: ${error.message}`);
    }

    return storagePath;
  }

  async createSignedPhotoUrl(storagePath: string | null | undefined): Promise<string | null> {
    if (!storagePath) return null;
    const { data, error } = await supabaseClient.storage
      .from(BUCKET_EVIDENCIAS)
      .createSignedUrl(storagePath, 3600);
    if (error || !data?.signedUrl) return null;
    return data.signedUrl;
  }

  async upsertActaConVotos(acta: Acta, storagePath: string): Promise<UpsertActaRpcResponse> {
    const votosPayload = acta.votos.map((v) => ({
      organizacion_id: v.organizacionId,
      cantidad: v.cantidad,
    }));

    const { data, error } = await supabaseClient.rpc('upsert_acta_con_votos', {
      p_client_uuid: acta.clientUuid,
      p_mesa_id: acta.mesaId,
      p_dignidad: acta.dignidad,
      p_total_sufragantes: acta.totalSufragantes,
      p_votos_blancos: acta.votosBlancos,
      p_votos_nulos: acta.votosNulos,
      p_votos: votosPayload,
      p_foto_path: storagePath,
      p_latitud: acta.latitud,
      p_longitud: acta.longitud,
      p_precision_gps: acta.precisionGps,
      p_base_version: acta.version,
    });

    if (error) {
      throw new Error(error.message);
    }

    return data as UpsertActaRpcResponse;
  }

  async getActaPorMesaYDignidad(
    mesaId: string,
    dignidad: DignidadElectoral
  ): Promise<Acta | null> {
    const { data, error } = await supabaseClient
      .from('actas')
      .select('*, votos(organizacion_id, cantidad)')
      .eq('mesa_id', mesaId)
      .eq('dignidad', dignidad)
      .maybeSingle();

    if (error || !data) return null;

    const fotoSignedUrl = await this.createSignedPhotoUrl(data.foto_path);
    const votos: Voto[] = ((data.votos ?? []) as { organizacion_id: string; cantidad: number }[]).map(
      (v) => ({
        organizacionId: v.organizacion_id,
        cantidad: Number(v.cantidad),
      })
    );

    return {
      id: data.id,
      clientUuid: data.client_uuid,
      mesaId: data.mesa_id,
      dignidad: data.dignidad as DignidadElectoral,
      totalSufragantes: Number(data.total_sufragantes),
      votosBlancos: Number(data.votos_blancos),
      votosNulos: Number(data.votos_nulos),
      votos,
      fotoPath: data.foto_path,
      fotoSignedUrl,
      latitud: Number(data.latitud),
      longitud: Number(data.longitud),
      precisionGps: Number(data.precision_gps),
      distanciaRecintoM: Number(data.distancia_recinto_m),
      alertaUbicacion: Boolean(data.alerta_ubicacion),
      version: Number(data.version),
      syncStatus: 'ENVIADO',
      registradoPor: data.registrado_por,
      modificadoPor: data.modificado_por,
      updatedAt: data.updated_at,
    };
  }

  async getActasAuditoria(recintoId?: string | null): Promise<ActaAuditoria[]> {
    const { data, error } = await supabaseClient
      .from('actas')
      .select(
        `*,
         votos(organizacion_id, cantidad),
         registrador:usuarios!actas_registrado_por_fkey(nombres, apellidos),
         mesa:mesas!inner(id, numero_jrv, genero, recinto_id, recinto:recintos!inner(id, nombre, latitud, longitud))`
      )
      .order('updated_at', { ascending: false });

    if (error) throw new Error(error.message);

    const results: ActaAuditoria[] = [];
    for (const row of data ?? []) {
      const mesa = unwrapOne(
        row.mesa as unknown as {
          id: string;
          numero_jrv: number;
          genero: GeneroMesa;
          recinto_id: string;
          recinto:
            | { id: string; nombre: string; latitud: number; longitud: number }
            | { id: string; nombre: string; latitud: number; longitud: number }[];
        }
      );
      if (!mesa) continue;
      if (recintoId && mesa.recinto_id !== recintoId) continue;

      const rec = unwrapOne(mesa.recinto);
      if (!rec) continue;
      const reg = unwrapOne(
        row.registrador as unknown as { nombres: string; apellidos: string } | null
      );

      results.push({
        id: row.id,
        clientUuid: row.client_uuid,
        mesaId: row.mesa_id,
        dignidad: row.dignidad as DignidadElectoral,
        totalSufragantes: Number(row.total_sufragantes),
        votosBlancos: Number(row.votos_blancos),
        votosNulos: Number(row.votos_nulos),
        votos: ((row.votos ?? []) as { organizacion_id: string; cantidad: number }[]).map((v) => ({
          organizacionId: v.organizacion_id,
          cantidad: Number(v.cantidad),
        })),
        fotoPath: row.foto_path,
        latitud: Number(row.latitud),
        longitud: Number(row.longitud),
        precisionGps: Number(row.precision_gps),
        distanciaRecintoM: Number(row.distancia_recinto_m),
        alertaUbicacion: Boolean(row.alerta_ubicacion),
        version: Number(row.version),
        syncStatus: 'ENVIADO',
        registradoPor: row.registrado_por,
        modificadoPor: row.modificado_por,
        updatedAt: row.updated_at,
        recintoId: rec.id,
        recintoNombre: rec.nombre,
        recintoLatitud: Number(rec.latitud),
        recintoLongitud: Number(rec.longitud),
        numeroJrv: Number(mesa.numero_jrv),
        generoMesa: mesa.genero,
        registradoPorNombre: reg ? `${reg.nombres} ${reg.apellidos}` : undefined,
      });
    }

    return results;
  }

  async getActaAuditoriaById(actaId: string): Promise<ActaAuditoria | null> {
    const { data: row, error } = await supabaseClient
      .from('actas')
      .select(
        `*,
         votos(organizacion_id, cantidad),
         registrador:usuarios!actas_registrado_por_fkey(nombres, apellidos),
         mesa:mesas!inner(id, numero_jrv, genero, recinto_id, recinto:recintos!inner(id, nombre, latitud, longitud))`
      )
      .eq('id', actaId)
      .maybeSingle();

    if (error || !row) return null;

    const mesa = unwrapOne(
      row.mesa as unknown as {
        id: string;
        numero_jrv: number;
        genero: GeneroMesa;
        recinto_id: string;
        recinto:
          | { id: string; nombre: string; latitud: number; longitud: number }
          | { id: string; nombre: string; latitud: number; longitud: number }[];
      }
    );
    const rec = unwrapOne(mesa?.recinto);
    if (!mesa || !rec) return null;

    const reg = unwrapOne(
      row.registrador as unknown as { nombres: string; apellidos: string } | null
    );
    const fotoSignedUrl = await this.createSignedPhotoUrl(row.foto_path);

    return {
      id: row.id,
      clientUuid: row.client_uuid,
      mesaId: row.mesa_id,
      dignidad: row.dignidad as DignidadElectoral,
      totalSufragantes: Number(row.total_sufragantes),
      votosBlancos: Number(row.votos_blancos),
      votosNulos: Number(row.votos_nulos),
      votos: ((row.votos ?? []) as { organizacion_id: string; cantidad: number }[]).map((v) => ({
        organizacionId: v.organizacion_id,
        cantidad: Number(v.cantidad),
      })),
      fotoPath: row.foto_path,
      fotoSignedUrl,
      latitud: Number(row.latitud),
      longitud: Number(row.longitud),
      precisionGps: Number(row.precision_gps),
      distanciaRecintoM: Number(row.distancia_recinto_m),
      alertaUbicacion: Boolean(row.alerta_ubicacion),
      version: Number(row.version),
      syncStatus: 'ENVIADO',
      registradoPor: row.registrado_por,
      modificadoPor: row.modificado_por,
      updatedAt: row.updated_at,
      recintoId: rec.id,
      recintoNombre: rec.nombre,
      recintoLatitud: Number(rec.latitud),
      recintoLongitud: Number(rec.longitud),
      numeroJrv: Number(mesa.numero_jrv),
      generoMesa: mesa.genero,
      registradoPorNombre: reg ? `${reg.nombres} ${reg.apellidos}` : undefined,
    };
  }

  async getConflictosPendientes(): Promise<ConflictoActa[]> {
    const { data, error } = await supabaseClient
      .from('acta_conflictos')
      .select(
        `*,
         usuario_entrante:usuarios!acta_conflictos_usuario_entrante_id_fkey(nombres, apellidos),
         acta:actas!inner(
           id, mesa_id, dignidad, total_sufragantes, votos_blancos, votos_nulos, foto_path, updated_at,
           votos(organizacion_id, cantidad),
           mesa:mesas!inner(numero_jrv)
         )`
      )
      .eq('estado', 'PENDIENTE')
      .order('created_at', { ascending: false });

    if (error) throw new Error(error.message);

    const list: ConflictoActa[] = [];
    for (const row of data ?? []) {
      const acta = unwrapOne(
        row.acta as unknown as {
          id: string;
          mesa_id: string;
          dignidad: DignidadElectoral;
          total_sufragantes: number;
          votos_blancos: number;
          votos_nulos: number;
          foto_path: string;
          updated_at: string;
          votos: { organizacion_id: string; cantidad: number }[];
          mesa: { numero_jrv: number } | { numero_jrv: number }[];
        }
      );
      if (!acta) continue;
      const mesa = unwrapOne(acta.mesa);
      const usr = unwrapOne(
        row.usuario_entrante as unknown as { nombres: string; apellidos: string } | null
      );

      const [fotoSrvUrl, fotoEntUrl] = await Promise.all([
        this.createSignedPhotoUrl(acta.foto_path),
        this.createSignedPhotoUrl(row.foto_entrante_path),
      ]);

      const datosEnt = (row.datos_entrantes ?? {}) as {
        total_sufragantes?: number;
        votos_blancos?: number;
        votos_nulos?: number;
        votos?: { organizacion_id: string; cantidad: number }[];
      };

      list.push({
        id: row.id,
        actaId: acta.id,
        mesaId: acta.mesa_id,
        numeroJrv: Number(mesa?.numero_jrv ?? 0),
        dignidad: acta.dignidad,
        versionBase: Number(row.version_base),
        versionServidor: Number(row.version_servidor),
        servidor: {
          totalSufragantes: Number(acta.total_sufragantes),
          votosBlancos: Number(acta.votos_blancos),
          votosNulos: Number(acta.votos_nulos),
          votos: (acta.votos ?? []).map((v) => ({
            organizacionId: v.organizacion_id,
            cantidad: Number(v.cantidad),
          })),
          fotoPath: acta.foto_path,
          fotoSignedUrl: fotoSrvUrl,
          updatedAt: acta.updated_at,
        },
        entrante: {
          totalSufragantes: Number(datosEnt.total_sufragantes ?? 0),
          votosBlancos: Number(datosEnt.votos_blancos ?? 0),
          votosNulos: Number(datosEnt.votos_nulos ?? 0),
          votos: (datosEnt.votos ?? []).map((v) => ({
            organizacionId: v.organizacion_id,
            cantidad: Number(v.cantidad),
          })),
          fotoPath: row.foto_entrante_path,
          fotoSignedUrl: fotoEntUrl,
          usuarioNombre: usr ? `${usr.nombres} ${usr.apellidos}` : 'Veedor',
          createdAt: row.created_at,
        },
        estado: row.estado,
      });
    }

    return list;
  }

  async resolverConflicto(
    conflictoId: string,
    decision: 'CONSERVAR_SERVIDOR' | 'APLICAR_ENTRANTE'
  ): Promise<void> {
    const { error } = await supabaseClient.rpc('resolver_conflicto_acta', {
      p_conflicto_id: conflictoId,
      p_decision: decision,
    });
    if (error) throw new Error(error.message);
  }

  /**
   * Consulta el Conteo Rápido (Exit Poll) usando los totales precalculados de ADR-11.
   */
  async getExitPollResumen(
    dignidad: DignidadElectoral,
    recintoId?: string | null
  ): Promise<ExitPollResumen> {
    let totalesQuery = supabaseClient
      .from('totales_escrutinio')
      .select('recinto_id, organizacion_id, total_votos')
      .eq('dignidad', dignidad);

    if (recintoId) {
      totalesQuery = totalesQuery.eq('recinto_id', recintoId);
    }

    const [totalesRes, orgsRes, candsRes, recintosRes, mesasRes, actasRes] =
      await Promise.all([
        totalesQuery,
        supabaseClient.from('organizaciones').select('*').order('numero_lista', { ascending: true }),
        supabaseClient.from('candidatos').select('*').eq('dignidad', dignidad),
        supabaseClient.from('recintos').select('id, nombre, parroquia').order('nombre', { ascending: true }),
        supabaseClient.from('mesas').select('id, recinto_id'),
        supabaseClient.from('actas').select('mesa_id, dignidad'),
      ]);

    if (totalesRes.error) throw new Error(totalesRes.error.message);
    if (orgsRes.error) throw new Error(orgsRes.error.message);

    // 1. Sumar votos desde totales_escrutinio precalculados
    const votosPorOrg = new Map<string, number>();
    let totalVotosValidos = 0;

    for (const row of (totalesRes.data ?? []) as {
      organizacion_id: string;
      total_votos: number;
    }[]) {
      const prev = votosPorOrg.get(row.organizacion_id) ?? 0;
      const sum = prev + Number(row.total_votos);
      votosPorOrg.set(row.organizacion_id, sum);
      totalVotosValidos += Number(row.total_votos);
    }

    const candPorOrg = new Map<string, string>();
    for (const c of (candsRes.data ?? []) as {
      organizacion_id: string;
      nombre_completo: string;
    }[]) {
      candPorOrg.set(c.organizacion_id, c.nombre_completo);
    }

    const resultados: ResultadoCandidato[] = (orgsRes.data ?? []).map((o) => {
      const votos = votosPorOrg.get(o.id) ?? 0;
      const porcentaje =
        totalVotosValidos > 0 ? Math.round((votos / totalVotosValidos) * 1000) / 10 : 0;

      return {
        organizacionId: o.id,
        numeroLista: Number(o.numero_lista),
        sigla: o.sigla,
        organizacionNombre: o.nombre,
        colorHex: o.color_hex,
        candidatoNombre: candPorOrg.get(o.id) ?? 'Candidato',
        votos,
        porcentaje,
      };
    });

    resultados.sort((a, b) => b.votos - a.votos || a.numeroLista - b.numeroLista);

    // 2. Calcular avance de mesas por recinto y total (S-02: completa = Alcaldía + Prefectura)
    const actasPorMesa = new Map<string, Set<DignidadElectoral>>();
    for (const a of (actasRes.data ?? []) as { mesa_id: string; dignidad: DignidadElectoral }[]) {
      const set = actasPorMesa.get(a.mesa_id) ?? new Set<DignidadElectoral>();
      set.add(a.dignidad);
      actasPorMesa.set(a.mesa_id, set);
    }

    const mesasPorRecinto = new Map<string, string[]>();
    for (const m of (mesasRes.data ?? []) as { id: string; recinto_id: string }[]) {
      const arr = mesasPorRecinto.get(m.recinto_id) ?? [];
      arr.push(m.id);
      mesasPorRecinto.set(m.recinto_id, arr);
    }

    const avancePorRecinto: AvanceRecinto[] = (recintosRes.data ?? []).map((r) => {
      const mIds = mesasPorRecinto.get(r.id) ?? [];
      let completas = 0;
      let parciales = 0;
      for (const id of mIds) {
        const size = actasPorMesa.get(id)?.size ?? 0;
        if (size === 2) completas++;
        else if (size === 1) parciales++;
      }
      const total = mIds.length;
      const pendientes = Math.max(0, total - completas - parciales);
      return {
        recintoId: r.id,
        nombre: r.nombre,
        parroquia: r.parroquia,
        totalMesas: total,
        mesasCompletas: completas,
        mesasParciales: parciales,
        mesasPendientes: pendientes,
        porcentajeAvance: total > 0 ? Math.round((completas / total) * 1000) / 10 : 0,
      };
    });

    const filtrados = recintoId
      ? avancePorRecinto.filter((r) => r.recintoId === recintoId)
      : avancePorRecinto;

    const totalMesas = filtrados.reduce((acc, r) => acc + r.totalMesas, 0);
    const mesasCompletas = filtrados.reduce((acc, r) => acc + r.mesasCompletas, 0);
    const mesasParciales = filtrados.reduce((acc, r) => acc + r.mesasParciales, 0);
    const mesasPendientes = filtrados.reduce((acc, r) => acc + r.mesasPendientes, 0);

    return {
      dignidad,
      recintoId: recintoId ?? null,
      totalMesas,
      mesasCompletas,
      mesasParciales,
      mesasPendientes,
      totalVotosValidos,
      resultados,
      avancePorRecinto,
    };
  }
}