import { Acta, ActaAuditoria, ConflictoActa, DignidadElectoral } from '../../domain/entities';
import { IActaRepository } from '../../domain/repositories';
import { ActaLocalDS } from '../datasources/local/actaLocalDS';
import { ActaRemoteDS } from '../datasources/remote/actaRemoteDS';

export class ActaRepositoryImpl implements IActaRepository {
  constructor(
    private readonly localDS: ActaLocalDS,
    private readonly remoteDS: ActaRemoteDS
  ) {}

  saveActaOffline(acta: Acta): Promise<Acta> {
    return this.localDS.saveActaAndEnqueue(acta);
  }

  async getActaPorMesaYDignidad(
    mesaId: string,
    dignidad: DignidadElectoral
  ): Promise<Acta | null> {
    const local = await this.localDS.getByMesaYDignidad(mesaId, dignidad);

    // Si hay una edición local pendiente de sincronizar, SQLite es la fuente de verdad (ADR-03)
    if (local && local.syncStatus !== 'ENVIADO') {
      return local;
    }

    try {
      const remote = await this.remoteDS.getActaPorMesaYDignidad(mesaId, dignidad);
      if (remote) {
        await this.localDS.cacheRemoteActa(remote);
        return remote;
      }
      return local;
    } catch {
      return local;
    }
  }

  getActasMiRecinto(): Promise<ActaAuditoria[]> {
    return this.remoteDS.getActasAuditoria();
  }

  getActaAuditoriaById(actaId: string): Promise<ActaAuditoria | null> {
    return this.remoteDS.getActaAuditoriaById(actaId);
  }

  getConflictosPendientes(): Promise<ConflictoActa[]> {
    return this.remoteDS.getConflictosPendientes();
  }

  resolverConflicto(
    conflictoId: string,
    decision: 'CONSERVAR_SERVIDOR' | 'APLICAR_ENTRANTE'
  ): Promise<void> {
    return this.remoteDS.resolverConflicto(conflictoId, decision);
  }
}