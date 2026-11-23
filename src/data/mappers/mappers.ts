import {
  Acta,
  Candidato,
  DignidadElectoral,
  EstadoSyncActa,
  GeneroMesa,
  Mesa,
  Organizacion,
  Recinto,
  RolUsuario,
  SyncItem,
  Usuario,
  Voto,
} from '../../domain/entities';

export function unwrapOne<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

export interface UsuarioRow {
  id: string;
  cedula: string;
  nombres: string;
  apellidos: string;
  telefono: string;
  email: string;
  rol: RolUsuario;
  must_change_password: boolean;
  es_externo: boolean;
  activo: boolean;
  created_by?: string | null;
  created_at?: string;
}

export function mapUsuarioRow(row: UsuarioRow): Usuario {
  return {
    id: row.id,
    cedula: row.cedula,
    nombres: row.nombres,
    apellidos: row.apellidos,
    telefono: row.telefono,
    email: row.email,
    rol: row.rol,
    mustChangePassword: Boolean(row.must_change_password),
    esExterno: Boolean(row.es_externo),
    activo: Boolean(row.activo),
    createdBy: row.created_by ?? null,
    createdAt: row.created_at,
  };
}

export interface OrganizacionRow {
  id: string;
  numero_lista: number;
  sigla: string;
  nombre: string;
  color_hex: string;
  es_cliente: boolean | number;
}

export function mapOrganizacionRow(row: OrganizacionRow): Organizacion {
  return {
    id: row.id,
    numeroLista: Number(row.numero_lista),
    sigla: row.sigla,
    nombre: row.nombre,
    colorHex: row.color_hex,
    esCliente: Boolean(row.es_cliente),
  };
}

export interface CandidatoRow {
  id: string;
  organizacion_id: string;
  dignidad: DignidadElectoral;
  nombre_completo: string;
}

export function mapCandidatoRow(row: CandidatoRow): Candidato {
  return {
    id: row.id,
    organizacionId: row.organizacion_id,
    dignidad: row.dignidad,
    nombreCompleto: row.nombre_completo,
  };
}

export interface RecintoRow {
  id: string;
  provincia: string;
  canton: string;
  parroquia: string;
  nombre: string;
  latitud: number;
  longitud: number;
  coordinador_id: string | null;
  coordinador?: { nombres: string; apellidos: string } | { nombres: string; apellidos: string }[] | null;
}

export function mapRecintoRow(row: RecintoRow): Recinto {
  const coord = unwrapOne(row.coordinador);
  return {
    id: row.id,
    provincia: row.provincia,
    canton: row.canton,
    parroquia: row.parroquia,
    nombre: row.nombre,
    latitud: Number(row.latitud),
    longitud: Number(row.longitud),
    coordinadorId: row.coordinador_id ?? null,
    coordinadorNombre: coord ? `${coord.nombres} ${coord.apellidos}` : null,
  };
}

export interface LocalMesaRow {
  id: string;
  veedor_id: string;
  recinto_id: string;
  recinto_nombre: string;
  recinto_latitud: number;
  recinto_longitud: number;
  numero_jrv: number;
  genero: GeneroMesa;
  updated_at: string;
}

export function mapLocalMesaRow(row: LocalMesaRow): Mesa {
  return {
    id: row.id,
    recintoId: row.recinto_id,
    recintoNombre: row.recinto_nombre,
    recintoLatitud: Number(row.recinto_latitud),
    recintoLongitud: Number(row.recinto_longitud),
    numeroJrv: Number(row.numero_jrv),
    genero: row.genero,
    veedorActivoId: row.veedor_id,
  };
}

export interface LocalActaRow {
  local_id: string;
  server_id: string | null;
  client_uuid: string;
  mesa_id: string;
  dignidad: DignidadElectoral;
  total_sufragantes: number;
  votos_blancos: number;
  votos_nulos: number;
  local_photo_uri: string | null;
  remote_photo_path: string | null;
  latitud: number;
  longitud: number;
  precision_gps: number;
  distancia_recinto_m: number;
  alerta_ubicacion: number;
  version: number;
  sync_status: EstadoSyncActa;
  error_message: string | null;
  registrado_por: string | null;
  modificado_por: string | null;
  updated_at: string;
}

export function mapLocalActaRow(row: LocalActaRow, votos: Voto[]): Acta {
  return {
    id: row.server_id ?? undefined,
    localId: row.local_id,
    clientUuid: row.client_uuid,
    mesaId: row.mesa_id,
    dignidad: row.dignidad,
    totalSufragantes: Number(row.total_sufragantes),
    votosBlancos: Number(row.votos_blancos),
    votosNulos: Number(row.votos_nulos),
    votos,
    fotoPath: row.remote_photo_path,
    localPhotoUri: row.local_photo_uri,
    latitud: Number(row.latitud),
    longitud: Number(row.longitud),
    precisionGps: Number(row.precision_gps),
    distanciaRecintoM: Number(row.distancia_recinto_m),
    alertaUbicacion: Boolean(row.alerta_ubicacion),
    version: Number(row.version),
    syncStatus: row.sync_status,
    errorMessage: row.error_message,
    registradoPor: row.registrado_por ?? undefined,
    modificadoPor: row.modificado_por ?? undefined,
    updatedAt: row.updated_at,
  };
}

export interface OutboxRow {
  id: string;
  operation_uuid: string;
  acta_local_id: string;
  mesa_id: string;
  dignidad: DignidadElectoral;
  status: EstadoSyncActa;
  attempts: number;
  last_error: string | null;
  created_at: string;
  updated_at: string;
  numero_jrv?: number | null;
}

export function mapOutboxRow(row: OutboxRow): SyncItem {
  return {
    id: row.id,
    operationUuid: row.operation_uuid,
    actaLocalId: row.acta_local_id,
    mesaId: row.mesa_id,
    numeroJrv: row.numero_jrv ?? undefined,
    dignidad: row.dignidad,
    status: row.status,
    attempts: Number(row.attempts),
    lastError: row.last_error,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}