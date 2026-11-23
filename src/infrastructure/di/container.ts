import { ActaLocalDS } from '../../data/datasources/local/actaLocalDS';
import { CatalogLocalDS } from '../../data/datasources/local/catalogLocalDS';
import { OutboxLocalDS } from '../../data/datasources/local/outboxLocalDS';
import { ActaRemoteDS } from '../../data/datasources/remote/actaRemoteDS';
import { AuthRemoteDS } from '../../data/datasources/remote/authRemoteDS';
import { RealtimeDS } from '../../data/datasources/remote/realtimeDS';
import { TerritorioRemoteDS } from '../../data/datasources/remote/territorioRemoteDS';
import { ActaRepositoryImpl } from '../../data/repositories/ActaRepositoryImpl';
import { AuthRepositoryImpl } from '../../data/repositories/AuthRepositoryImpl';
import { EscrutinioRepositoryImpl } from '../../data/repositories/EscrutinioRepositoryImpl';
import { SyncRepositoryImpl } from '../../data/repositories/SyncRepositoryImpl';
import { TerritorioRepositoryImpl } from '../../data/repositories/TerritorioRepositoryImpl';
import {
  GetActaAuditoriaUseCase,
  GetActaPorMesaYDignidadUseCase,
  GetActasMiRecintoUseCase,
  GetConflictosPendientesUseCase,
  ResolverConflictoActaUseCase,
  SaveActaOfflineUseCase,
  ValidateEvidenceCaptureUseCase,
} from '../../domain/usecases/actas/actaUseCases';
import {
  ChangePasswordUseCase,
  CreateManagedUserUseCase,
  LoginUseCase,
  LogoutUseCase,
  RequestPasswordRecoveryUseCase,
} from '../../domain/usecases/auth/authUseCases';
import {
  GetActasAuditoriaJurisdiccionUseCase,
  GetExitPollResumenUseCase,
  SubscribeEscrutinioRealtimeUseCase,
} from '../../domain/usecases/escrutinio/escrutinioUseCases';
import {
  GetSyncQueueUseCase,
  ProcessSyncQueueUseCase,
  RetryFailedSyncUseCase,
} from '../../domain/usecases/sync/syncUseCases';
import {
  AsignarCoordinadorRecintoUseCase,
  CreateRecintoUseCase,
  GetCatalogosElectoralesUseCase,
  GetCoordinadoresRecintoUseCase,
  GetMesasVeedorUseCase,
  GetPanelRecintoUseCase,
  GetRecintosUseCase,
  ReasignarMesaVeedorUseCase,
} from '../../domain/usecases/territorio/territorioUseCases';
import { GpsLocationAdapter } from '../device/gpsLocationAdapter';
import { SharpnessAnalyzer } from '../device/sharpnessAnalyzer';
import { SentryAdapter } from '../monitoring/sentryAdapter';
import { NetInfoSyncManager } from '../network/netInfoSyncManager';
import { FileSystemPhotoAdapter } from '../storage/fileSystemPhotoAdapter';

// 1. Adaptadores de Infraestructura
const fileStorageAdapter = new FileSystemPhotoAdapter();
const gpsLocationAdapter = new GpsLocationAdapter();
const sharpnessAnalyzer = new SharpnessAnalyzer();
export const sentryAdapter = new SentryAdapter();
export const netInfoSyncManager = new NetInfoSyncManager();

// 2. Datasources Locales y Remotos
const catalogLocalDS = new CatalogLocalDS();
const actaLocalDS = new ActaLocalDS();
const outboxLocalDS = new OutboxLocalDS();

const authRemoteDS = new AuthRemoteDS();
const territorioRemoteDS = new TerritorioRemoteDS();
const actaRemoteDS = new ActaRemoteDS();
const realtimeDS = new RealtimeDS();

// 3. Repositorios
const authRepository = new AuthRepositoryImpl(authRemoteDS);
const territorioRepository = new TerritorioRepositoryImpl(
  territorioRemoteDS,
  catalogLocalDS,
  actaLocalDS
);
const actaRepository = new ActaRepositoryImpl(actaLocalDS, actaRemoteDS);
const escrutinioRepository = new EscrutinioRepositoryImpl(actaRemoteDS, realtimeDS);
const syncRepository = new SyncRepositoryImpl(
  actaLocalDS,
  outboxLocalDS,
  actaRemoteDS,
  sentryAdapter
);

// 4. Casos de Uso exportados para Presentation (ADR-07, RNF-05)
export const container = {
  // Puertos / Servicios directos requeridos en el ciclo de vida
  authRepository,
  syncRepository,
  networkMonitor: netInfoSyncManager,
  crashMonitor: sentryAdapter,

  // Auth
  loginUseCase: new LoginUseCase(authRepository, sentryAdapter),
  logoutUseCase: new LogoutUseCase(authRepository, sentryAdapter),
  changePasswordUseCase: new ChangePasswordUseCase(authRepository),
  requestPasswordRecoveryUseCase: new RequestPasswordRecoveryUseCase(authRepository),
  createManagedUserUseCase: new CreateManagedUserUseCase(authRepository),

  // Territorio
  getCatalogosElectoralesUseCase: new GetCatalogosElectoralesUseCase(territorioRepository),
  getRecintosUseCase: new GetRecintosUseCase(territorioRepository),
  createRecintoUseCase: new CreateRecintoUseCase(territorioRepository),
  asignarCoordinadorRecintoUseCase: new AsignarCoordinadorRecintoUseCase(territorioRepository),
  getCoordinadoresRecintoUseCase: new GetCoordinadoresRecintoUseCase(territorioRepository),
  getPanelRecintoUseCase: new GetPanelRecintoUseCase(territorioRepository),
  reasignarMesaVeedorUseCase: new ReasignarMesaVeedorUseCase(territorioRepository),
  getMesasVeedorUseCase: new GetMesasVeedorUseCase(territorioRepository),

  // Actas y Conflictos
  saveActaOfflineUseCase: new SaveActaOfflineUseCase(actaRepository, fileStorageAdapter),
  validateEvidenceCaptureUseCase: new ValidateEvidenceCaptureUseCase(
    sharpnessAnalyzer,
    gpsLocationAdapter
  ),
  getActaPorMesaYDignidadUseCase: new GetActaPorMesaYDignidadUseCase(actaRepository),
  getActasMiRecintoUseCase: new GetActasMiRecintoUseCase(actaRepository),
  getActaAuditoriaUseCase: new GetActaAuditoriaUseCase(actaRepository),
  getConflictosPendientesUseCase: new GetConflictosPendientesUseCase(actaRepository),
  resolverConflictoActaUseCase: new ResolverConflictoActaUseCase(actaRepository),

  // Escrutinio / Exit Poll en vivo
  getExitPollResumenUseCase: new GetExitPollResumenUseCase(escrutinioRepository),
  getActasAuditoriaJurisdiccionUseCase: new GetActasAuditoriaJurisdiccionUseCase(
    escrutinioRepository
  ),
  subscribeEscrutinioRealtimeUseCase: new SubscribeEscrutinioRealtimeUseCase(
    escrutinioRepository
  ),

  // Sincronización Offline
  processSyncQueueUseCase: new ProcessSyncQueueUseCase(
    syncRepository,
    netInfoSyncManager,
    sentryAdapter
  ),
  getSyncQueueUseCase: new GetSyncQueueUseCase(syncRepository),
  retryFailedSyncUseCase: new RetryFailedSyncUseCase(syncRepository),
};