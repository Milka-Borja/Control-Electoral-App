import { ActaAuditoria, DignidadElectoral, ExitPollResumen } from '../../domain/entities';
import { IEscrutinioRepository } from '../../domain/repositories';
import { ActaRemoteDS } from '../datasources/remote/actaRemoteDS';
import { RealtimeDS } from '../datasources/remote/realtimeDS';

export class EscrutinioRepositoryImpl implements IEscrutinioRepository {
  constructor(
    private readonly actaRemoteDS: ActaRemoteDS,
    private readonly realtimeDS: RealtimeDS
  ) {}

  getExitPollResumen(
    dignidad: DignidadElectoral,
    recintoId?: string | null
  ): Promise<ExitPollResumen> {
    return this.actaRemoteDS.getExitPollResumen(dignidad, recintoId);
  }

  getActasAuditoriaJurisdiccion(recintoId?: string | null): Promise<ActaAuditoria[]> {
    return this.actaRemoteDS.getActasAuditoria(recintoId);
  }

  subscribeEscrutinioRealtime(onChange: () => void): () => void {
    return this.realtimeDS.subscribeEscrutinioChanges(onChange);
  }
}