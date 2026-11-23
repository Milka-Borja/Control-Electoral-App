import { useRouter } from 'expo-router';
import { ChevronRight, ClipboardList, CloudUpload, RefreshCw } from 'lucide-react-native';
import React, { useEffect } from 'react';
import {
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Mesa } from '../../../domain/entities';
import { AppHeader } from '../../components/AppHeader';
import { StatusBadge } from '../../components/StatusBadge';
import {
  useCatalogosQuery,
  useMesasVeedorQuery,
  useTriggerSync,
} from '../../hooks/useElectoralQueries';
import { useAuthStore } from '../../store/authStore';
import { useSyncStore } from '../../store/syncStore';
import { theme } from '../../theme/theme';

export function VeedorMesasScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const { pendingCount, isSyncing } = useSyncStore();
  const triggerSync = useTriggerSync();

  // Precargar catálogos (5 organizaciones + 10 candidatos) en SQLite apenas entra el veedor
  useCatalogosQuery();

  const { data: mesas = [], isLoading, refetch, isRefetching } = useMesasVeedorQuery(user?.id);

  useEffect(() => {
    void triggerSync();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const renderMesa = ({ item }: { item: Mesa }) => {
    const avanceColor =
      item.avance === 'COMPLETA'
        ? theme.colors.secondary
        : item.avance === 'PARCIAL'
          ? theme.colors.warning
          : theme.colors.textMuted;

    return (
      <Pressable
        onPress={() =>
          router.push({
            pathname: '/(veedor)/mesa/[mesaId]',
            params: {
              mesaId: item.id,
              numeroJrv: String(item.numeroJrv),
              genero: item.genero,
              recintoNombre: item.recintoNombre ?? '',
              recintoLat: String(item.recintoLatitud ?? 0),
              recintoLon: String(item.recintoLongitud ?? 0),
            },
          })
        }
        style={({ pressed }) => [styles.card, pressed && { opacity: 0.9 }]}
      >
        <View style={styles.cardHeader}>
          <View>
            <Text style={styles.jrvTitle}>
              JRV N.° {item.numeroJrv} ({item.genero === 'M' ? 'Hombres' : 'Mujeres'})
            </Text>
            <Text style={styles.recintoText}>{item.recintoNombre}</Text>
          </View>
          <View style={[styles.avancePill, { backgroundColor: `${avanceColor}1A` }]}>
            <Text style={[styles.avanceText, { color: avanceColor }]}>
              {item.avance ?? 'PENDIENTE'}
            </Text>
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.dignidadRow}>
          <Text style={styles.dignidadLabel}>Alcaldía de Quito</Text>
          <StatusBadge status={item.estadoAlcaldia ?? 'PENDIENTE'} />
        </View>

        <View style={styles.dignidadRow}>
          <Text style={styles.dignidadLabel}>Prefectura de Pichincha</Text>
          <StatusBadge status={item.estadoPrefectura ?? 'PENDIENTE'} />
        </View>

        <View style={styles.cardFooter}>
          <Text style={styles.ctaText}>Ingresar o revisar actas</Text>
          <ChevronRight size={18} color={theme.colors.primary} />
        </View>
      </Pressable>
    );
  };

  return (
    <View style={styles.root}>
      <AppHeader
        title="Mis Mesas Asignadas"
        subtitle={user ? `${user.nombres} ${user.apellidos} · Veedor` : 'Veedor'}
        showLogout
        rightSlot={
          <Pressable
            onPress={() => router.push('/(veedor)/cola-sync')}
            style={styles.syncHeaderBtn}
          >
            <CloudUpload size={20} color={theme.colors.white} />
            {pendingCount > 0 ? (
              <View style={styles.counterBadge}>
                <Text style={styles.counterText}>{pendingCount}</Text>
              </View>
            ) : null}
          </Pressable>
        }
      />

      <FlatList
        data={mesas}
        keyExtractor={(item) => item.id}
        renderItem={renderMesa}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching || isSyncing}
            onRefresh={async () => {
              await triggerSync();
              await refetch();
            }}
            colors={[theme.colors.primary]}
          />
        }
        ListHeaderComponent={
          <View style={styles.summaryBar}>
            <View style={{ flex: 1 }}>
              <Text style={styles.summaryTitle}>
                {mesas.length} mesa{mesas.length === 1 ? '' : 's'} bajo su responsabilidad
              </Text>
              <Text style={styles.summarySub}>
                Funciona sin conexión: sus actas se sincronizan al recuperar señal.
              </Text>
            </View>
            <Pressable
              onPress={() => router.push('/(veedor)/cola-sync')}
              style={styles.colaBtn}
            >
              <RefreshCw size={16} color={theme.colors.primary} />
              <Text style={styles.colaBtnText}>Cola ({pendingCount})</Text>
            </Pressable>
          </View>
        }
        ListEmptyComponent={
          !isLoading ? (
            <View style={styles.emptyBox}>
              <ClipboardList size={48} color={theme.colors.textMuted} />
              <Text style={styles.emptyTitle}>Sin mesas asignadas</Text>
              <Text style={styles.emptyDesc}>
                Solicite a su Coordinador de Recinto que le asigne una o más mesas (JRV).
              </Text>
            </View>
          ) : null
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.colors.background },
  list: { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 32 },
  syncHeaderBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.14)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  counterBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 20,
    height: 20,
    borderRadius: 99,
    backgroundColor: theme.colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  counterText: { fontSize: 11, fontWeight: '800', color: theme.colors.primaryDark },
  summaryBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: theme.colors.surface,
    padding: 14,
    borderRadius: theme.radius.md,
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.secondary,
    marginBottom: 12,
    elevation: 2,
  },
  summaryTitle: { fontSize: 15, fontWeight: '800', color: theme.colors.text },
  summarySub: { fontSize: 13, color: theme.colors.textSecondary, marginTop: 2 },
  colaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: theme.colors.accentSoft,
  },
  colaBtnText: { fontSize: 13, fontWeight: '800', color: theme.colors.primary },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 10,
  },
  jrvTitle: { fontSize: 18, fontWeight: '800', color: theme.colors.primary },
  recintoText: { fontSize: 13, color: theme.colors.textSecondary, marginTop: 2 },
  avancePill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: theme.radius.pill,
  },
  avanceText: { fontSize: 11, fontWeight: '800' },
  divider: { height: 1, backgroundColor: theme.colors.surfaceAlt, marginVertical: 12 },
  dignidadRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  dignidadLabel: {
    flex: 1,
    minWidth: 0,
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
  },
  ctaText: { fontSize: 14, fontWeight: '700', color: theme.colors.primary },
  emptyBox: {
    alignItems: 'center',
    padding: 36,
    marginTop: 24,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    gap: 8,
  },
  emptyTitle: { fontSize: 18, fontWeight: '800', color: theme.colors.text },
  emptyDesc: { fontSize: 14, color: theme.colors.textSecondary, textAlign: 'center' },
});