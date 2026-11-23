import { SyncItem } from '../../entities';
import { ICrashMonitorPort, INetworkMonitorPort } from '../../ports';
import { ISyncRepository } from '../../repositories';

export interface SyncRunSummary {
  procesados: number;
  enviados: number;
  conflictos: number;
  fallados: number;
}

export class ProcessSyncQueueUseCase {
  constructor(
    private readonly syncRepo: ISyncRepository,
    private readonly networkMonitor: INetworkMonitorPort,
    private readonly crashMonitor: ICrashMonitorPort
  ) {}

  async execute(): Promise<SyncRunSummary> {
    const summary: SyncRunSummary = {
      procesados: 0,
      enviados: 0,
      conflictos: 0,
      fallados: 0,
    };

    const online = await this.networkMonitor.isOnline();
    if (!online) return summary;

    const pending = await this.syncRepo.getPendingOutbox();

    for (const item of pending) {
      summary.procesados++;
      try {
        const result = await this.syncRepo.processOutboxItem(item);
        if (result === 'ENVIADO') summary.enviados++;
        else if (result === 'CONFLICTO') summary.conflictos++;
        else summary.fallados++;
      } catch (error) {
        summary.fallados++;
        // RF-17 / ADR-05: reportar error no fatal que impide completar la tarea
        this.crashMonitor.captureNonFatal(error, {
          screen: 'SyncEngine',
          action: 'processOutboxItem',
          extra: {
            dignidad: item.dignidad,
            attempts: item.attempts,
          },
        });
      }
    }

    return summary;
  }
}

export class GetSyncQueueUseCase {
  constructor(private readonly syncRepo: ISyncRepository) {}

  execute(): Promise<SyncItem[]> {
    return this.syncRepo.getPendingOutbox();
  }
}

export class RetryFailedSyncUseCase {
  constructor(private readonly syncRepo: ISyncRepository) {}

  execute(): Promise<void> {
    return this.syncRepo.retryFailedItems();
  }
}