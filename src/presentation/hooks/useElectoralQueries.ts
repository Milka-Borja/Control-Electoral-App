import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { DignidadElectoral } from '../../domain/entities';
import { container, netInfoSyncManager } from '../../infrastructure/di/container';
import { useSyncStore } from '../store/syncStore';

export const QUERY_KEYS = {
  catalogos: ['catalogos'] as const,
  mesasVeedor: (veedorId: string) => ['mesas-veedor', veedorId] as const,
  acta: (mesaId: string, dignidad: DignidadElectoral) => ['acta', mesaId, dignidad] as const,
  syncQueue: ['sync-queue'] as const,
  panelRecinto: ['panel-recinto'] as const,
  actasRecinto: ['actas-recinto'] as const,
  conflictos: ['conflictos-pendientes'] as const,
  recintos: ['recintos-jurisdiccion'] as const,
  coordinadores: ['coordinadores-recinto'] as const,
  exitPoll: (dignidad: DignidadElectoral, recintoId: string | null) =>
    ['exit-poll', dignidad, recintoId ?? 'ALL'] as const,
  actasAuditoria: (recintoId: string | null) =>
    ['actas-auditoria', recintoId ?? 'ALL'] as const,
  actaAuditoria: (actaId: string) => ['acta-auditoria', actaId] as const,
};

export function useCatalogosQuery() {
  return useQuery({
    queryKey: QUERY_KEYS.catalogos,
    queryFn: () => container.getCatalogosElectoralesUseCase.execute(),
    staleTime: 1000 * 60 * 10,
  });
}

export function useMesasVeedorQuery(veedorId?: string) {
  return useQuery({
    queryKey: QUERY_KEYS.mesasVeedor(veedorId ?? ''),
    queryFn: () => container.getMesasVeedorUseCase.execute(veedorId!),
    enabled: Boolean(veedorId),
  });
}

export function useActaQuery(mesaId?: string, dignidad?: DignidadElectoral) {
  return useQuery({
    queryKey: QUERY_KEYS.acta(mesaId ?? '', dignidad ?? 'ALCALDIA'),
    queryFn: () => container.getActaPorMesaYDignidadUseCase.execute(mesaId!, dignidad!),
    enabled: Boolean(mesaId && dignidad),
  });
}

export function useSyncQueueQuery() {
  return useQuery({
    queryKey: QUERY_KEYS.syncQueue,
    queryFn: () => container.getSyncQueueUseCase.execute(),
  });
}

// --- Queries Coordinador de Recinto ---

export function usePanelRecintoQuery() {
  return useQuery({
    queryKey: QUERY_KEYS.panelRecinto,
    queryFn: () => container.getPanelRecintoUseCase.execute(),
  });
}

export function useActasRecintoQuery() {
  return useQuery({
    queryKey: QUERY_KEYS.actasRecinto,
    queryFn: () => container.getActasMiRecintoUseCase.execute(),
  });
}

export function useConflictosPendientesQuery() {
  return useQuery({
    queryKey: QUERY_KEYS.conflictos,
    queryFn: () => container.getConflictosPendientesUseCase.execute(),
  });
}

// --- Queries Coordinador Provincial ---

export function useRecintosQuery() {
  return useQuery({
    queryKey: QUERY_KEYS.recintos,
    queryFn: () => container.getRecintosUseCase.execute(),
  });
}

export function useCoordinadoresQuery() {
  return useQuery({
    queryKey: QUERY_KEYS.coordinadores,
    queryFn: () => container.getCoordinadoresRecintoUseCase.execute(),
  });
}

export function useExitPollQuery(dignidad: DignidadElectoral, recintoId: string | null) {
  return useQuery({
    queryKey: QUERY_KEYS.exitPoll(dignidad, recintoId),
    queryFn: () => container.getExitPollResumenUseCase.execute(dignidad, recintoId),
  });
}

export function useActasAuditoriaQuery(recintoId: string | null) {
  return useQuery({
    queryKey: QUERY_KEYS.actasAuditoria(recintoId),
    queryFn: () => container.getActasAuditoriaJurisdiccionUseCase.execute(recintoId),
  });
}

export function useActaAuditoriaByIdQuery(actaId?: string) {
  return useQuery({
    queryKey: QUERY_KEYS.actaAuditoria(actaId ?? ''),
    queryFn: () => container.getActaAuditoriaUseCase.execute(actaId!),
    enabled: Boolean(actaId),
  });
}

/**
 * Suscripción encapsulada a Supabase Realtime (ADR-07).
 * Invalida selectivamente las consultas en vivo y limpia el canal al desmontar.
 */
export function useEscrutinioRealtimeSync() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const unsubscribe = container.subscribeEscrutinioRealtimeUseCase.execute(() => {
      void queryClient.invalidateQueries({ queryKey: ['exit-poll'] });
      void queryClient.invalidateQueries({ queryKey: ['actas-auditoria'] });
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.recintos });
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.panelRecinto });
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.actasRecinto });
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.conflictos });
    });

    return unsubscribe;
  }, [queryClient]);
}

export function useTriggerSync() {
  const queryClient = useQueryClient();
  const { setSyncing, setPendingCount, markSyncedNow } = useSyncStore();

  return async () => {
    const countBefore = await container.syncRepository.getPendingCount();
    setPendingCount(countBefore);
    if (countBefore === 0) return { procesados: 0, enviados: 0, conflictos: 0, fallados: 0 };

    const online = await container.networkMonitor.isOnline();
    if (!online) return { procesados: 0, enviados: 0, conflictos: 0, fallados: 0 };

    const result = await netInfoSyncManager.runExclusive(async () => {
      setSyncing(true);
      try {
        const summary = await container.processSyncQueueUseCase.execute();
        const remaining = await container.syncRepository.getPendingCount();
        setPendingCount(remaining);
        if (summary.enviados > 0 || summary.conflictos > 0) {
          markSyncedNow();
        }
        await queryClient.invalidateQueries();
        return summary;
      } finally {
        setSyncing(false);
      }
    });

    return result ?? { procesados: 0, enviados: 0, conflictos: 0, fallados: 0 };
  };
}