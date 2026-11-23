import { useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, GitMerge } from 'lucide-react-native';
import React from 'react';
import { FlatList, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { ConflictoActa } from '../../../domain/entities';
import { container } from '../../../infrastructure/di/container';
import { AppHeader } from '../../components/AppHeader';
import {
  QUERY_KEYS,
  useCatalogosQuery,
  useConflictosPendientesQuery,
} from '../../hooks/useElectoralQueries';
import { useFeedbackStore } from '../../store/feedbackStore';
import { theme } from '../../theme/theme';

export function RecintoConflictosScreen() {
  const queryClient = useQueryClient();
  const { data: conflictos = [], refetch, isRefetching } = useConflictosPendientesQuery();
  const { data: catalogos } = useCatalogosQuery();
  const { openConfirm, showLoading, hideFeedback, showSuccess, showError } =
    useFeedbackStore();

  const orgMap = new Map(
    (catalogos?.organizaciones ?? []).map((o) => [o.id, `L${o.numeroLista} ${o.sigla}`])
  );

  const resolver = (
    conflicto: ConflictoActa,
    decision: 'CONSERVAR_SERVIDOR' | 'APLICAR_ENTRANTE'
  ) => {
    openConfirm({
      title:
        decision === 'CONSERVAR_SERVIDOR'
          ? 'Conservar versión del servidor'
          : 'Aplicar versión entrante offline',
      message:
        decision === 'CONSERVAR_SERVIDOR'
          ? 'Se descartará la edición entrante y prevalecerán los datos actuales del servidor.'
          : 'Se actualizará el acta oficial con los datos entrantes, se incrementará su versión y se recalcularán los totales.',
      confirmLabel: 'Confirmar decisión',
      onConfirm: async () => {
        showLoading('Resolviendo conflicto...', 'Actualizando historial y totales');
        try {
          await container.resolverConflictoActaUseCase.execute(conflicto.id, decision);
          await queryClient.invalidateQueries({ queryKey: QUERY_KEYS.conflictos });
          await queryClient.invalidateQueries({ queryKey: QUERY_KEYS.actasRecinto });
          hideFeedback();
          showSuccess('Conflicto resuelto', 'La versión elegida quedó registrada como oficial.');
        } catch (err) {
          hideFeedback();
          showError(
            'Error al resolver',
            err instanceof Error ? err.message : 'Intente nuevamente'
          );
        }
      },
    });
  };

  const renderConflicto = ({ item }: { item: ConflictoActa }) => (
    <View style={styles.card}>
      <View style={styles.header}>
        <GitMerge size={20} color={theme.colors.conflict} />
        <Text style={styles.title}>
          JRV N.° {item.numeroJrv} ·{' '}
          {item.dignidad === 'ALCALDIA' ? 'Alcaldía' : 'Prefectura'}
        </Text>
      </View>

      <View style={styles.compareRow}>
        {/* Columna Servidor */}
        <View style={[styles.col, { borderColor: theme.colors.primary }]}>
          <Text style={[styles.colTitle, { color: theme.colors.primary }]}>
            Servidor (v{item.versionServidor})
          </Text>
          {item.servidor.fotoSignedUrl ? (
            <Image
              source={{ uri: item.servidor.fotoSignedUrl }}
              style={styles.thumb}
            />
          ) : null}
          <Text style={styles.line}>Sufragantes: {item.servidor.totalSufragantes}</Text>
          <Text style={styles.line}>
            Bl: {item.servidor.votosBlancos} · Nu: {item.servidor.votosNulos}
          </Text>
          {item.servidor.votos.map((v) => (
            <Text key={v.organizacionId} style={styles.voteLine}>
              {orgMap.get(v.organizacionId) ?? 'Lista'}: {v.cantidad}
            </Text>
          ))}
        </View>

        {/* Columna Entrante */}
        <View style={[styles.col, { borderColor: theme.colors.warning }]}>
          <Text style={[styles.colTitle, { color: theme.colors.warning }]}>
            Entrante (base v{item.versionBase})
          </Text>
          {item.entrante.fotoSignedUrl ? (
            <Image
              source={{ uri: item.entrante.fotoSignedUrl }}
              style={styles.thumb}
            />
          ) : null}
          <Text style={styles.line}>Sufragantes: {item.entrante.totalSufragantes}</Text>
          <Text style={styles.line}>
            Bl: {item.entrante.votosBlancos} · Nu: {item.entrante.votosNulos}
          </Text>
          {item.entrante.votos.map((v) => (
            <Text key={v.organizacionId} style={styles.voteLine}>
              {orgMap.get(v.organizacionId) ?? 'Lista'}: {v.cantidad}
            </Text>
          ))}
          <Text style={styles.author}>Por: {item.entrante.usuarioNombre}</Text>
        </View>
      </View>

      <View style={styles.btnRow}>
        <Pressable
          onPress={() => resolver(item, 'CONSERVAR_SERVIDOR')}
          style={[styles.choiceBtn, { backgroundColor: theme.colors.primary }]}
        >
          <Text style={styles.choiceText}>Mantener Servidor</Text>
        </Pressable>
        <Pressable
          onPress={() => resolver(item, 'APLICAR_ENTRANTE')}
          style={[styles.choiceBtn, { backgroundColor: theme.colors.secondary }]}
        >
          <Text style={styles.choiceText}>Aplicar Entrante</Text>
        </Pressable>
      </View>
    </View>
  );

  return (
    <View style={styles.root}>
      <AppHeader
        title="Conflictos de Versiones"
        subtitle="Ediciones concurrentes sin conexión (S-04)"
        showBack
      />
      <FlatList
        data={conflictos}
        keyExtractor={(c) => c.id}
        renderItem={renderConflicto}
        contentContainerStyle={styles.list}
        refreshing={isRefetching}
        onRefresh={refetch}
        ListEmptyComponent={
          <View style={styles.emptyBox}>
            <CheckCircle2 size={46} color={theme.colors.secondary} />
            <Text style={styles.emptyTitle}>Sin conflictos pendientes</Text>
            <Text style={styles.emptyDesc}>
              Todas las actas del recinto están sincronizadas sin colisiones de versión.
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
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    padding: 14,
    gap: 12,
    elevation: 2,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { fontSize: 17, fontWeight: '800', color: theme.colors.text },
  compareRow: { flexDirection: 'row', gap: 10 },
  col: {
    flex: 1,
    borderWidth: 1.5,
    borderRadius: 12,
    padding: 10,
    backgroundColor: theme.colors.background,
    gap: 3,
  },
  colTitle: { fontSize: 13, fontWeight: '800', marginBottom: 4 },
  thumb: { width: '100%', height: 90, borderRadius: 8, marginBottom: 4, backgroundColor: '#000' },
  line: { fontSize: 12, fontWeight: '700', color: theme.colors.text },
  voteLine: { fontSize: 12, color: theme.colors.textSecondary },
  author: { fontSize: 11, fontStyle: 'italic', color: theme.colors.textMuted, marginTop: 4 },
  btnRow: { flexDirection: 'row', gap: 10 },
  choiceBtn: {
    flex: 1,
    minHeight: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  choiceText: { color: theme.colors.white, fontSize: 14, fontWeight: '700' },
  emptyBox: {
    alignItems: 'center',
    padding: 36,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    gap: 8,
  },
  emptyTitle: { fontSize: 17, fontWeight: '800', color: theme.colors.text },
  emptyDesc: { fontSize: 14, color: theme.colors.textSecondary, textAlign: 'center' },
});