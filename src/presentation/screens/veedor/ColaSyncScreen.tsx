import { CheckCircle2, CloudOff, RefreshCw } from 'lucide-react-native';
import React from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SyncItem } from '../../../domain/entities';
import { container } from '../../../infrastructure/di/container';
import { AppHeader } from '../../components/AppHeader';
import { StatusBadge } from '../../components/StatusBadge';
import { useSyncQueueQuery, useTriggerSync } from '../../hooks/useElectoralQueries';
import { useFeedbackStore } from '../../store/feedbackStore';
import { useSyncStore } from '../../store/syncStore';
import { theme } from '../../theme/theme';

export function ColaSyncScreen() {
  const { data: items = [], refetch } = useSyncQueueQuery();
  const { isOnline, isSyncing } = useSyncStore();
  const triggerSync = useTriggerSync();
  const { showSyncing, hideFeedback, showSuccess, showWarning } = useFeedbackStore();

  const handleManualRetry = async () => {
    if (!isOnline) {
      showWarning(
        'Sin conexión a internet',
        'Sus actas están seguras en SQLite. Se enviarán automáticamente en cuanto vuelva la señal.'
      );
      return;
    }

    showSyncing('Sincronizando cola...', 'Reintentando envío seguro sin duplicados');
    try {
      await container.retryFailedSyncUseCase.execute();
      const summary = await triggerSync();
      await refetch();
      hideFeedback();
      showSuccess(
        'Sincronización completada',
        `Enviadas: ${summary.enviados} · Conflictos: ${summary.conflictos} · Fallidas: ${summary.fallados}`
      );
    } catch {
      hideFeedback();
    }
  };

  const renderItem = ({ item }: { item: SyncItem }) => (
    <View style={styles.card}>
      <View style={styles.row}>
        <Text style={styles.title}>
          {item.numeroJrv ? `JRV N.° ${item.numeroJrv} · ` : ''}
          {item.dignidad === 'ALCALDIA' ? 'Alcaldía' : 'Prefectura'}
        </Text>
        <StatusBadge status={item.status} />
      </View>
      <Text style={styles.meta}>
        Intentos: {item.attempts} · ID operación: {item.operationUuid.slice(0, 8)}...
      </Text>
      {item.lastError ? <Text style={styles.errorText}>{item.lastError}</Text> : null}
    </View>
  );

  return (
    <View style={styles.root}>
      <AppHeader
        title="Cola de Sincronización"
        subtitle={isOnline ? 'Conexión activa' : 'Modo sin conexión (SQLite)'}
        showBack
      />

      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <Pressable
            onPress={handleManualRetry}
            disabled={isSyncing}
            style={[styles.syncBtn, !isOnline && { backgroundColor: theme.colors.warning }]}
          >
            {isOnline ? (
              <RefreshCw size={20} color={theme.colors.white} />
            ) : (
              <CloudOff size={20} color={theme.colors.white} />
            )}
            <Text style={styles.syncBtnText}>
              {isSyncing
                ? 'Sincronizando...'
                : isOnline
                  ? 'Sincronizar / Reintentar ahora'
                  : 'Esperando señal para enviar'}
            </Text>
          </Pressable>
        }
        ListEmptyComponent={
          <View style={styles.emptyBox}>
            <CheckCircle2 size={50} color={theme.colors.secondary} />
            <Text style={styles.emptyTitle}>Todo sincronizado</Text>
            <Text style={styles.emptyDesc}>
              No tiene actas pendientes ni con error en este dispositivo.
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.colors.background },
  list: { paddingHorizontal: 16, paddingTop: 14, gap: 12, paddingBottom: 16 },
  syncBtn: {
    minHeight: theme.touch.minButtonHeight,
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radius.md,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  syncBtnText: { color: theme.colors.white, fontSize: 16, fontWeight: '700' },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    padding: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: 6,
  },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: 16, fontWeight: '800', color: theme.colors.text },
  meta: { fontSize: 12, color: theme.colors.textSecondary },
  errorText: { fontSize: 13, color: theme.colors.danger, fontWeight: '600', marginTop: 4 },
  emptyBox: {
    alignItems: 'center',
    padding: 36,
    marginTop: 20,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    gap: 8,
  },
  emptyTitle: { fontSize: 18, fontWeight: '800', color: theme.colors.text },
  emptyDesc: { fontSize: 14, color: theme.colors.textSecondary, textAlign: 'center' },
});