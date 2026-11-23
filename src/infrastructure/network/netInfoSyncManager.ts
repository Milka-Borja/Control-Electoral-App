import NetInfo, { NetInfoState } from '@react-native-community/netinfo';
import { INetworkMonitorPort } from '../../domain/ports';

function evaluateOnline(state: NetInfoState): boolean {
  return Boolean(state.isConnected && state.isInternetReachable !== false);
}

export class NetInfoSyncManager implements INetworkMonitorPort {
  private isSyncLocked = false;
  private rerunRequested = false;

  async isOnline(): Promise<boolean> {
    const state = await NetInfo.fetch();
    return evaluateOnline(state);
  }

  subscribe(listener: (isOnline: boolean) => void): () => void {
    return NetInfo.addEventListener((state) => {
      listener(evaluateOnline(state));
    });
  }

  /**
   * Lock de concurrencia (mutex) para evitar envíos simultáneos duplicados (ADR-10).
   * Si llega una nueva señal mientras sincroniza, agenda exactamente una pasada extra al finalizar.
   */
  async runExclusive<T>(task: () => Promise<T>): Promise<T | null> {
    if (this.isSyncLocked) {
      this.rerunRequested = true;
      return null;
    }

    this.isSyncLocked = true;
    try {
      let lastResult = await task();
      while (this.rerunRequested) {
        this.rerunRequested = false;
        lastResult = await task();
      }
      return lastResult;
    } finally {
      this.isSyncLocked = false;
    }
  }
}