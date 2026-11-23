import { ActaAuditoria, DignidadElectoral, ExitPollResumen } from '../../entities';
import { IEscrutinioRepository } from '../../repositories';

export class GetExitPollResumenUseCase {
  constructor(private readonly escrutinioRepo: IEscrutinioRepository) {}

  execute(
    dignidad: DignidadElectoral,
    recintoId?: string | null
  ): Promise<ExitPollResumen> {
    return this.escrutinioRepo.getExitPollResumen(dignidad, recintoId);
  }
}

export class GetActasAuditoriaJurisdiccionUseCase {
  constructor(private readonly escrutinioRepo: IEscrutinioRepository) {}

  execute(recintoId?: string | null): Promise<ActaAuditoria[]> {
    return this.escrutinioRepo.getActasAuditoriaJurisdiccion(recintoId);
  }
}

export class SubscribeEscrutinioRealtimeUseCase {
  constructor(private readonly escrutinioRepo: IEscrutinioRepository) {}

  execute(onChange: () => void): () => void {
    return this.escrutinioRepo.subscribeEscrutinioRealtime(onChange);
  }
}