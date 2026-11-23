import { useRouter } from 'expo-router';
import {
  AlertTriangle,
  Building2,
  ChevronRight,
  Landmark,
  MapPin,
  Users,
} from 'lucide-react-native';
import React, { useState } from 'react';
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Animated, { useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { DignidadElectoral, ResultadoCandidato } from '../../../domain/entities';
import { AppHeader } from '../../components/AppHeader';
import {
  useActasAuditoriaQuery,
  useEscrutinioRealtimeSync,
  useExitPollQuery,
  useRecintosQuery,
} from '../../hooks/useElectoralQueries';
import { theme } from '../../theme/theme';

function CandidateBarRow({ item, rank }: { item: ResultadoCandidato; rank: number }) {
  const barStyle = useAnimatedStyle(() => ({
    width: withTiming(`${Math.min(100, item.porcentaje)}%`, { duration: 400 }),
  }));

  return (
    <View style={styles.candCard}>
      <View style={styles.candTop}>
        <View style={[styles.listaBadge, { backgroundColor: item.colorHex }]}>
          <Text style={styles.listaText}>L{item.numeroLista}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.candName} numberOfLines={1}>
            {rank === 1 && item.votos > 0 ? '★ ' : ''}
            {item.candidatoNombre}
          </Text>
          <Text style={styles.orgSub} numberOfLines={1}>
            {item.sigla} · {item.organizacionNombre}
          </Text>
        </View>
        <View style={styles.votesCol}>
          <Text style={styles.pctText}>{item.porcentaje.toFixed(1)}%</Text>
          <Text style={styles.votesText}>{item.votos} votos</Text>
        </View>
      </View>
      <View style={styles.barTrack}>
        <Animated.View
          style={[styles.barFill, { backgroundColor: item.colorHex }, barStyle]}
        />
      </View>
    </View>
  );
}

export function ProvincialExitPollScreen() {
  const router = useRouter();
  useEscrutinioRealtimeSync();

  const [dignidad, setDignidad] = useState<DignidadElectoral>('ALCALDIA');
  const [selectedRecintoId, setSelectedRecintoId] = useState<string | null>(null);

  const { data: recintos = [] } = useRecintosQuery();
  const {
    data: resumen,
    refetch: refetchPoll,
    isRefetching,
  } = useExitPollQuery(dignidad, selectedRecintoId);
  const { data: actasAuditoria = [], refetch: refetchActas } =
    useActasAuditoriaQuery(selectedRecintoId);

  return (
    <View style={styles.root}>
      <AppHeader
        title="Exit Poll en Tiempo Real"
        subtitle="Seguimiento provincial · Pichincha – Quito"
        showLogout
      />

      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={async () => {
              await Promise.all([refetchPoll(), refetchActas()]);
            }}
            colors={[theme.colors.primary]}
          />
        }
      >
        {/* Accesos de gestión territorial y personal */}
        <View style={styles.quickNavRow}>
          <Pressable
            onPress={() => router.push('/(provincial)/recintos')}
            style={styles.quickBtn}
          >
            <Building2 size={20} color={theme.colors.primary} />
            <Text style={styles.quickBtnText}>Recintos ({recintos.length})</Text>
          </Pressable>

          <Pressable
            onPress={() => router.push('/(provincial)/coordinadores')}
            style={styles.quickBtn}
          >
            <Users size={20} color={theme.colors.secondary} />
            <Text style={styles.quickBtnText}>Coord. Recinto</Text>
          </Pressable>
        </View>

        {/* Selector de Dignidad: Alcaldía vs Prefectura (RF-15) */}
        <View style={styles.toggleRow}>
          <Pressable
            onPress={() => setDignidad('ALCALDIA')}
            style={[
              styles.toggleBtn,
              dignidad === 'ALCALDIA' && styles.toggleBtnActive,
            ]}
          >
            <Building2
              size={18}
              color={dignidad === 'ALCALDIA' ? theme.colors.white : theme.colors.primary}
            />
            <Text
              style={[
                styles.toggleText,
                dignidad === 'ALCALDIA' && styles.toggleTextActive,
              ]}
            >
              Alcaldía Quito
            </Text>
          </Pressable>

          <Pressable
            onPress={() => setDignidad('PREFECTURA')}
            style={[
              styles.toggleBtn,
              dignidad === 'PREFECTURA' && styles.toggleBtnActive,
            ]}
          >
            <Landmark
              size={18}
              color={
                dignidad === 'PREFECTURA' ? theme.colors.white : theme.colors.primary
              }
            />
            <Text
              style={[
                styles.toggleText,
                dignidad === 'PREFECTURA' && styles.toggleTextActive,
              ]}
            >
              Prefectura Pichincha
            </Text>
          </Pressable>
        </View>

        {/* Filtro Total Provincial vs Por Recinto (RF-15) */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipsRow}
        >
          <Pressable
            onPress={() => setSelectedRecintoId(null)}
            style={[styles.chip, selectedRecintoId === null && styles.chipActive]}
          >
            <Text
              style={[
                styles.chipText,
                selectedRecintoId === null && styles.chipTextActive,
              ]}
            >
              Total Jurisdicción
            </Text>
          </Pressable>

          {recintos.map((r) => (
            <Pressable
              key={r.id}
              onPress={() => setSelectedRecintoId(r.id)}
              style={[
                styles.chip,
                selectedRecintoId === r.id && styles.chipActive,
              ]}
            >
              <Text
                style={[
                  styles.chipText,
                  selectedRecintoId === r.id && styles.chipTextActive,
                ]}
              >
                {r.nombre}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        {/* KPIs de avance de mesas (RF-15, S-02) */}
        <View style={styles.kpiRow}>
          <View style={[styles.kpiCard, { borderTopColor: theme.colors.secondary }]}>
            <Text style={[styles.kpiVal, { color: theme.colors.secondary }]}>
              {resumen?.mesasCompletas ?? 0}/{resumen?.totalMesas ?? 0}
            </Text>
            <Text style={styles.kpiLbl}>Mesas completas</Text>
          </View>
          <View style={[styles.kpiCard, { borderTopColor: theme.colors.warning }]}>
            <Text style={[styles.kpiVal, { color: theme.colors.warning }]}>
              {resumen?.mesasParciales ?? 0}
            </Text>
            <Text style={styles.kpiLbl}>Parciales (1 acta)</Text>
          </View>
          <View style={[styles.kpiCard, { borderTopColor: theme.colors.primary }]}>
            <Text style={[styles.kpiVal, { color: theme.colors.primary }]}>
              {resumen?.mesasPendientes ?? 0}
            </Text>
            <Text style={styles.kpiLbl}>Faltantes</Text>
          </View>
        </View>

        {/* Resultados acumulados en vivo por candidato */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>
            Conteo acumulado ({resumen?.totalVotosValidos ?? 0} votos válidos)
          </Text>
          <View style={styles.livePill}>
            <View style={styles.liveDot} />
            <Text style={styles.liveText}>EN VIVO</Text>
          </View>
        </View>

        {(resumen?.resultados ?? []).map((item, idx) => (
          <CandidateBarRow key={item.organizacionId} item={item} rank={idx + 1} />
        ))}

        {/* Avance por recinto */}
        <Text style={[styles.sectionTitle, { marginTop: 8 }]}>
          Avance por Recinto Electoral
        </Text>
        {(resumen?.avancePorRecinto ?? []).map((rec) => (
          <View key={rec.recintoId} style={styles.recintoProgCard}>
            <View style={styles.recintoProgTop}>
              <Text style={styles.recintoProgName}>{rec.nombre}</Text>
              <Text style={styles.recintoProgPct}>{rec.porcentajeAvance}%</Text>
            </View>
            <Text style={styles.recintoProgSub}>
              Completas: {rec.mesasCompletas} · Parciales: {rec.mesasParciales} ·
              Faltantes: {rec.mesasPendientes} (de {rec.totalMesas} JRV)
            </Text>
          </View>
        ))}

        {/* Actas recibidas para auditoría de evidencia fotográfica y GPS (RF-12, RF-15, S-06) */}
        <Text style={[styles.sectionTitle, { marginTop: 8 }]}>
          Actas Recibidas — Evidencia y GPS ({actasAuditoria.length})
        </Text>
        {actasAuditoria.map((acta) => (
          <Pressable
            key={acta.id ?? acta.clientUuid}
            onPress={() =>
              router.push({
                pathname: '/(provincial)/acta-auditoria/[id]',
                params: { id: acta.id! },
              })
            }
            style={styles.auditRow}
          >
            <View style={{ flex: 1 }}>
              <Text style={styles.auditTitle}>
                {acta.recintoNombre} · JRV {acta.numeroJrv}
              </Text>
              <Text style={styles.auditSub}>
                {acta.dignidad === 'ALCALDIA' ? 'Alcaldía' : 'Prefectura'} ·{' '}
                {acta.totalSufragantes} sufragantes
              </Text>
              <View style={styles.gpsLine}>
                {acta.alertaUbicacion ? (
                  <>
                    <AlertTriangle size={14} color={theme.colors.danger} />
                    <Text style={styles.gpsAlert}>
                      Alerta: tomada a {acta.distanciaRecintoM} m (&gt;300 m)
                    </Text>
                  </>
                ) : (
                  <>
                    <MapPin size={14} color={theme.colors.secondary} />
                    <Text style={styles.gpsOk}>
                      En recinto ({acta.distanciaRecintoM} m)
                    </Text>
                  </>
                )}
              </View>
            </View>
            <ChevronRight size={20} color={theme.colors.primary} />
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.colors.background },
  scroll: { padding: theme.spacing.md, gap: 12, paddingBottom: 36 },
  quickNavRow: { flexDirection: 'row', gap: 10 },
  quickBtn: {
    flex: 1,
    minHeight: 50,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  quickBtnText: { fontSize: 15, fontWeight: '800', color: theme.colors.text },
  toggleRow: { flexDirection: 'row', gap: 10 },
  toggleBtn: {
    flex: 1,
    minHeight: 50,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.surface,
    borderWidth: 1.5,
    borderColor: theme.colors.primary,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  toggleBtnActive: { backgroundColor: theme.colors.primary },
  toggleText: { fontSize: 15, fontWeight: '800', color: theme.colors.primary },
  toggleTextActive: { color: theme.colors.white },
  chipsRow: { gap: 8, paddingVertical: 2 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 99,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  chipActive: {
    backgroundColor: theme.colors.primaryDark,
    borderColor: theme.colors.primaryDark,
  },
  chipText: { fontSize: 13, fontWeight: '700', color: theme.colors.text },
  chipTextActive: { color: theme.colors.white },
  kpiRow: { flexDirection: 'row', gap: 10 },
  kpiCard: {
    flex: 1,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    padding: 12,
    alignItems: 'center',
    borderTopWidth: 4,
    elevation: 2,
  },
  kpiVal: { fontSize: 21, fontWeight: '800' },
  kpiLbl: { fontSize: 11, fontWeight: '700', color: theme.colors.textSecondary, marginTop: 2 },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: theme.colors.text },
  livePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: theme.colors.secondarySoft,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 99,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 99,
    backgroundColor: theme.colors.secondary,
  },
  liveText: { fontSize: 11, fontWeight: '800', color: theme.colors.secondary },
  candCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    padding: 13,
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: 8,
  },
  candTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  listaBadge: {
    width: 42,
    height: 42,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listaText: { color: theme.colors.white, fontSize: 13, fontWeight: '800' },
  candName: { fontSize: 15, fontWeight: '800', color: theme.colors.text },
  orgSub: { fontSize: 12, color: theme.colors.textSecondary },
  votesCol: { alignItems: 'flex-end' },
  pctText: { fontSize: 17, fontWeight: '800', color: theme.colors.primary },
  votesText: { fontSize: 12, color: theme.colors.textSecondary },
  barTrack: {
    height: 9,
    backgroundColor: theme.colors.surfaceAlt,
    borderRadius: 99,
    overflow: 'hidden',
  },
  barFill: { height: '100%', borderRadius: 99 },
  recintoProgCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    padding: 13,
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.primary,
  },
  recintoProgTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  recintoProgName: { flex: 1, fontSize: 15, fontWeight: '700', color: theme.colors.text },
  recintoProgPct: { fontSize: 15, fontWeight: '800', color: theme.colors.secondary },
  recintoProgSub: { fontSize: 12, color: theme.colors.textSecondary, marginTop: 3 },
  auditRow: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  auditTitle: { fontSize: 15, fontWeight: '800', color: theme.colors.primary },
  auditSub: { fontSize: 13, color: theme.colors.textSecondary, marginTop: 2 },
  gpsLine: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 4 },
  gpsOk: { fontSize: 12, fontWeight: '700', color: theme.colors.secondary },
  gpsAlert: { fontSize: 12, fontWeight: '700', color: theme.colors.danger },
});