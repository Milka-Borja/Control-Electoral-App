import { supabaseClient } from '../../../infrastructure/supabase/supabaseClient';

export class RealtimeDS {
  subscribeEscrutinioChanges(onChange: () => void): () => void {
    const channelName = `escrutinio-live-${Date.now()}`;

    const channel = supabaseClient
      .channel(channelName)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'totales_escrutinio' },
        () => onChange()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'actas' },
        () => onChange()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'acta_conflictos' },
        () => onChange()
      )
      .subscribe();

    return () => {
      void supabaseClient.removeChannel(channel);
    };
  }
}