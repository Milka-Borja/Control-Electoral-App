export type RolUsuario = 'PROVINCIAL' | 'RECINTO' | 'VEEDOR';
export type DignidadElectoral = 'ALCALDIA' | 'PREFECTURA';
export type GeneroMesa = 'M' | 'F';

// Estados de acta exigidos por RF-14, RNF-06, ADR-10 y S-04
export type EstadoSyncActa =
  | 'GUARDADO'
  | 'EN_PROCESO'
  | 'ENVIADO'
  | 'FALLADO'
  | 'CONFLICTO';

// Avance de mesa exigido por S-02 (completa = Alcaldía + Prefectura)
export type EstadoAvanceMesa = 'PENDIENTE' | 'PARCIAL' | 'COMPLETA';

export type EstadoConflicto =
  | 'PENDIENTE'
  | 'RESUELTO_CONSERVAR_SERVIDOR'
  | 'RESUELTO_APLICAR_ENTRANTE';

export interface Usuario {
  id: string;
  cedula: string;
  nombres: string;
  apellidos: string;
  telefono: string;
  email: string;
  rol: RolUsuario;
  mustChangePassword: boolean;
  esExterno: boolean;
  activo: boolean;
  createdBy?: string | null;
  createdAt?: string;
}

export interface Recinto {
  id: string;
  provincia: string;
  canton: string;
  parroquia: string;
  nombre: string;
  latitud: number;
  longitud: number;
  coordinadorId: string | null;
  coordinadorNombre?: string | null;
  totalMesas?: number;
  mesasCompletas?: number;
  mesasParciales?: number;
}

export interface Mesa {
  id: string;
  recintoId: string;
  recintoNombre?: string;
  recintoLatitud?: number;
  recintoLongitud?: number;
  numeroJrv: number;
  genero: GeneroMesa;
  veedorActivoId?: string | null;
  veedorActivoNombre?: string | null;
  estadoAlcaldia?: EstadoSyncActa | 'PENDIENTE';
  estadoPrefectura?: EstadoSyncActa | 'PENDIENTE';
  avance?: EstadoAvanceMesa;
}

export interface AsignacionVeedor {
  id: string;
  mesaId: string;
  veedorId: string;
  asignadoPor: string | null;
  activa: boolean;
  fechaAsignacion: string;
  fechaRevocacion: string | null;
}

export interface Organizacion {
  id: string;
  numeroLista: number;
  sigla: string;
  nombre: string;
  colorHex: string;
  esCliente: boolean;
}

export interface Candidato {
  id: string;
  organizacionId: string;
  dignidad: DignidadElectoral;
  nombreCompleto: string;
}

export interface Voto {
  organizacionId: string;
  cantidad: number;
}

export interface Acta {
  id?: string;
  localId?: string;
  clientUuid: string;
  mesaId: string;
  dignidad: DignidadElectoral;
  totalSufragantes: number;
  votosBlancos: number;
  votosNulos: number;
  votos: Voto[];
  fotoPath?: string | null;
  localPhotoUri?: string | null;
  fotoSignedUrl?: string | null;
  latitud: number;
  longitud: number;
  precisionGps: number;
  distanciaRecintoM: number;
  alertaUbicacion: boolean;
  version: number;
  syncStatus: EstadoSyncActa;
  errorMessage?: string | null;
  registradoPor?: string;
  modificadoPor?: string;
  updatedAt: string;
}

export interface ActaAuditoria extends Acta {
  recintoId: string;
  recintoNombre: string;
  recintoLatitud: number;
  recintoLongitud: number;
  numeroJrv: number;
  generoMesa: GeneroMesa;
  registradoPorNombre?: string;
}

export interface ConflictoActa {
  id: string;
  actaId: string;
  mesaId: string;
  numeroJrv: number;
  dignidad: DignidadElectoral;
  versionBase: number;
  versionServidor: number;
  servidor: {
    totalSufragantes: number;
    votosBlancos: number;
    votosNulos: number;
    votos: Voto[];
    fotoPath: string;
    fotoSignedUrl?: string | null;
    updatedAt: string;
  };
  entrante: {
    totalSufragantes: number;
    votosBlancos: number;
    votosNulos: number;
    votos: Voto[];
    fotoPath: string;
    fotoSignedUrl?: string | null;
    usuarioNombre: string;
    createdAt: string;
  };
  estado: EstadoConflicto;
}

export interface SyncItem {
  id: string;
  operationUuid: string;
  actaLocalId: string;
  mesaId: string;
  numeroJrv?: number;
  dignidad: DignidadElectoral;
  status: EstadoSyncActa;
  attempts: number;
  lastError: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ResultadoCandidato {
  organizacionId: string;
  numeroLista: number;
  sigla: string;
  organizacionNombre: string;
  colorHex: string;
  candidatoNombre: string;
  votos: number;
  porcentaje: number;
}

export interface AvanceRecinto {
  recintoId: string;
  nombre: string;
  parroquia: string;
  totalMesas: number;
  mesasCompletas: number;
  mesasParciales: number;
  mesasPendientes: number;
  porcentajeAvance: number;
}

export interface ExitPollResumen {
  dignidad: DignidadElectoral;
  recintoId: string | null; // null = total provincial
  totalMesas: number;
  mesasCompletas: number;
  mesasParciales: number;
  mesasPendientes: number;
  totalVotosValidos: number;
  resultados: ResultadoCandidato[];
  avancePorRecinto: AvanceRecinto[];
}