import {
  Acta,
  ActaAuditoria,
  Candidato,
  ConflictoActa,
  DignidadElectoral,
  ExitPollResumen,
  Mesa,
  Organizacion,
  Recinto,
  SyncItem,
  Usuario,
} from '../entities';
import { CreateRecintoInput, CreateUserInput } from '../validators/userSchema';

export interface CreateManagedUserResult {
  userId: string;
  email: string;
  tempPassword: string;
  message: string;
  warning?: string;
}

export interface IAuthRepository {
  login(email: string, password: string): Promise<Usuario>;
  logout(): Promise<void>;
  getCurrentSessionUser(): Promise<Usuario | null>;
  changePassword(newPassword: string, isFirstLogin: boolean): Promise<void>;
  requestPasswordRecovery(email: string): Promise<void>;
  createManagedUser(input: CreateUserInput): Promise<CreateManagedUserResult>;
  handleDeepLinkUrl(url: string): Promise<'RECOVERY' | 'VERIFIED' | 'NONE'>;
}

export interface ITerritorioRepository {
  // Catálogos precargados (RF-05) con respaldo offline en SQLite
  getOrganizacionesYCandidatos(): Promise<{
    organizaciones: Organizacion[];
    candidatos: Candidato[];
  }>;

  // Coordinador Provincial (RF-06, RF-07)
  getRecintosJurisdiccion(): Promise<Recinto[]>;
  createRecinto(input: CreateRecintoInput): Promise<Recinto>;
  asignarCoordinadorRecinto(recintoId: string, coordinadorId: string): Promise<void>;
  getCoordinadoresRecinto(): Promise<Usuario[]>;

  // Coordinador de Recinto (RF-08, RF-20, S-05)
  getMiRecinto(): Promise<Recinto | null>;
  getMesasMiRecinto(): Promise<Mesa[]>;
  getVeedoresMiRecinto(): Promise<Usuario[]>;
  reasignarMesaVeedor(mesaId: string, nuevoVeedorId: string): Promise<void>;

  // Veedor (RF-18, RNF-03 — con caché local offline)
  getMesasAsignadasVeedor(veedorId: string): Promise<Mesa[]>;
}

export interface IActaRepository {
  saveActaOffline(acta: Acta): Promise<Acta>;
  getActaPorMesaYDignidad(
    mesaId: string,
    dignidad: DignidadElectoral
  ): Promise<Acta | null>;
  getActasMiRecinto(): Promise<ActaAuditoria[]>;
  getActaAuditoriaById(actaId: string): Promise<ActaAuditoria | null>;
  getConflictosPendientes(): Promise<ConflictoActa[]>;
  resolverConflicto(
    conflictoId: string,
    decision: 'CONSERVAR_SERVIDOR' | 'APLICAR_ENTRANTE'
  ): Promise<void>;
}

export interface IEscrutinioRepository {
  getExitPollResumen(
    dignidad: DignidadElectoral,
    recintoId?: string | null
  ): Promise<ExitPollResumen>;
  getActasAuditoriaJurisdiccion(recintoId?: string | null): Promise<ActaAuditoria[]>;
  // Encapsula Supabase Realtime sin exponer SDK a presentation (ADR-07)
  subscribeEscrutinioRealtime(onChange: () => void): () => void;
}

export interface ISyncRepository {
  getPendingOutbox(): Promise<SyncItem[]>;
  getPendingCount(): Promise<number>;
  processOutboxItem(item: SyncItem): Promise<'ENVIADO' | 'CONFLICTO' | 'FALLADO'>;
  retryFailedItems(): Promise<void>;
}