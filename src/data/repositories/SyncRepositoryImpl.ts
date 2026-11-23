import { SyncItem } from '../../domain/entities';
import { ICrashMonitorPort } from '../../domain/ports';
import { ISyncRepository } from '../../domain/repositories';
import { ActaLocalDS } from '../datasources/local/actaLocalDS';
import { OutboxLocalDS } from '../datasources/local/outboxLocalDS';
import { ActaRemoteDS } from '../datasources/remote/actaRemoteDS';

export class SyncRepositoryImpl implements ISyncRepository {
  constructor(
    private readonly actaLocalDS: ActaLocalDS,
    private readonly outboxLocalDS: OutboxLocalDS,
    private readonly actaRemoteDS: ActaRemoteDS,
    private readonly crashMonitor: ICrashMonitorPort
  ) {}

  getPendingOutbox(): Promise<SyncItem[]> {
    return this.outboxLocalDS.getAllQueueItems();
  }

  getPendingCount(): Promise<number> {
    return this.outboxLocalDS.getPendingCount();
  }

  async processOutboxItem(item: SyncItem): Promise<'ENVIADO' | 'CONFLICTO' | 'FALLADO'> {
    if (item.status === 'CONFLICTO') {
      return 'CONFLICTO';
    }

    const localActa = await this.actaLocalDS.getByLocalId(item.actaLocalId);
    if (!localActa) {
      await this.outboxLocalDS.removeItem(item.id);
      return 'ENVIADO';
    }

    // 1. Marcar EN PROCESO (RF-14)
    await this.outboxLocalDS.markStatus(item.id, 'EN_PROCESO', null, true);
    await this.actaLocalDS.updateSyncState(item.actaLocalId, {
      status: 'EN_PROCESO',
      errorMessage: null,
    });

    try {
      // 2. Subir fotografía si aún no tiene ruta remota confirmada (ADR-03)
      let remotePhotoPath = localActa.fotoPath ?? null;
      if (!remotePhotoPath) {
        if (!localActa.localPhotoUri) {
          throw new Error('No existe la fotografía local del acta para subirla al servidor.');
        }
        remotePhotoPath = await this.actaRemoteDS.uploadEvidencePhoto(
          localActa.localPhotoUri,
          localActa.mesaId,
          localActa.dignidad,
          localActa.clientUuid
        );
      }

      // 3. Ejecutar RPC idempotente con control de versión y totales precalculados (ADR-10, ADR-11, S-04)
      const res = await this.actaRemoteDS.upsertActaConVotos(localActa, remotePhotoPath);

      if (res.status === 'CONFLICT' || res.status === 'CONFLICT_ALREADY_RECORDED') {
        await this.actaLocalDS.updateSyncState(item.actaLocalId, {
          status: 'CONFLICTO',
          remotePhotoPath,
          errorMessage:
            'Conflicto de versión: el coordinador de recinto revisará ambas versiones.',
        });
        await this.outboxLocalDS.markStatus(
          item.id,
          'CONFLICTO',
          'Pendiente de decisión del coordinador de recinto'
        );
        return 'CONFLICTO';
      }

      // 4. Confirmado en servidor: marcar ENVIADO y limpiar de la cola outbox (ADR-03)
      await this.actaLocalDS.updateSyncState(item.actaLocalId, {
        status: 'ENVIADO',
        serverId: res.acta_id,
        version: res.version,
        remotePhotoPath,
        errorMessage: null,
      });
      await this.outboxLocalDS.removeItem(item.id);
      return 'ENVIADO';
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Error desconocido durante la sincronización';

      await this.actaLocalDS.updateSyncState(item.actaLocalId, {
        status: 'FALLADO',
        errorMessage: message,
      });
      await this.outboxLocalDS.markStatus(item.id, 'FALLADO', message);

      // RF-17 & ADR-05: reportar fallo no fatal que impidió completar el envío (ej. fallo de foto)
      this.crashMonitor.captureNonFatal(error, {
        screen: 'SyncRepositoryImpl',
        action: 'processOutboxItem',
        extra: {
          dignidad: localActa.dignidad,
          attempts: item.attempts + 1,
        },
      });

      return 'FALLADO';
    }
  }

  retryFailedItems(): Promise<void> {
    return this.outboxLocalDS.resetFailedToPending();
  }
}