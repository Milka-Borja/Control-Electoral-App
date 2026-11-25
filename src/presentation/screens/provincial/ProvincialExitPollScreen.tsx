import { useRouter } from 'expo-router';
import {
  AlertTriangle,
  Building2,
  ChevronRight,
  Landmark,
  MapPin,
  Star,
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
import { PartyLogoBadge } from '../../components/PartyLogoBadge';
import {
  useActasAuditoriaQuery,
  useEscrutinioRealtimeSync,
  useExitPollQuery,
  useRecintosQuery,
} from '../../hooks/useElectoralQueries';
import { getPartyColor, theme } from '../../theme/theme';

function CandidateBarRow({ item, rank }: { item: ResultadoCandidato; rank: number }) {
  const partyColor = getPartyColor(item.numeroLista, item.sigla, item.colorHex);
  const barStyle = useAnimatedStyle(() => ({
    width: withTiming(`${Math.min(100, item.porcentaje)}%`, { duration: 400 }),
  }));

  return (
    <View
      style={[
        styles.candCard,
        item.esCliente === true && styles.candCardClient,
        { borderLeftColor: partyColor },
      ]}
    >
      <View style={styles.candTop}>
        <PartyLogoBadge numeroLista={item.numeroLista} sigla={item.sigla} />
        <View style={styles.candidateInfo}>
          <View style={styles.candidateNameRow}>
            {rank === 1 && item.votos > 0 ? (
              <Star size={16} color={theme.colors.amber} fill={theme.colors.amber} />
            ) : null}
            <Text style={styles.candName} numberOfLines={1}>
              {item.candidatoNombre}
            </Text>
          </View>
          <Text style={[styles.orgSub, { color: partyColor }]} numberOfLines={1}>
            Lista {item.numeroLista} · {item.sigla}
          </Text>
          <Text style={styles.orgName} numberOfLines={1}>
            {item.organizacionNombre}
          </Text>
          {item.esCliente === true ? (
            <Text style={styles.orgClientBadge}>
              LISTA 21 · CREO
            </Text>
          ) : null}
        </View>
        <View style={styles.votesCol}>
          <Text style={[styles.pctText, { color: partyColor }]}>
            {item.porcentaje.toFixed(1)}%
          </Text>
          <Text style={styles.votesText}>{item.votos} votos</Text>
        </View>
      </View>
      <View style={styles.barTrack}>
        <Animated.View
          style={[styles.barFill, { backgroundColor: partyColor }, barStyle]}
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
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.78}
              style={[
                styles.toggleText,
                dignidad === 'ALCALDIA' && styles.toggleTextActive,
              ]}
            >
              Alcaldía de Quito
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
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.78}
              style={[
                styles.toggleText,
                dignidad === 'PREFECTURA' && styles.toggleTextActive,
              ]}
            >
              Prefectura de Pichincha
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
          <Text style={[styles.sectionTitle, styles.sectionHeaderTitle]}>
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
  scroll: { paddingHorizontal: 16, paddingTop: 14, gap: 12, paddingBottom: 36 },
  quickNavRow: { flexDirection: 'row', gap: 10 },
  quickBtn: {
    flex: 1,
    minHeight: theme.touch.minButtonHeight,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  quickBtnText: { fontSize: 16, fontWeight: '800', color: theme.colors.text },
  toggleRow: { flexDirection: 'row', gap: 8 },
  toggleBtn: {
    flex: 1,
    minWidth: 0,
    minHeight: theme.touch.minButtonHeight,
    paddingHorizontal: 8,
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
  toggleText: {
    flex: 1,
    minWidth: 0,
    fontSize: 15,
    fontWeight: '800',
    color: theme.colors.primary,
    textAlign: 'center',
  },
  toggleTextActive: { color: theme.colors.white },
  chipsRow: { gap: 8, paddingVertical: 2 },
  chip: {
    minHeight: theme.touch.minButtonHeight,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 99,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    justifyContent: 'center',
  },
  chipActive: {
    backgroundColor: theme.colors.primaryDark,
    borderColor: theme.colors.primaryDark,
  },
  chipText: { fontSize: 15, fontWeight: '700', color: theme.colors.text },
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
  kpiVal: { fontSize: theme.typography.voteNumber, fontWeight: '800' },
  kpiLbl: { fontSize: 13, fontWeight: '700', color: theme.colors.textSecondary, marginTop: 2 },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  sectionHeaderTitle: { flex: 1, minWidth: 0 },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: theme.colors.text },
  livePill: {
    flexDirection: 'row',
    flexShrink: 0,
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
  liveText: {
    flexShrink: 0,
    fontSize: 12,
    fontWeight: '800',
    color: theme.colors.secondary,
  },
  candCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    padding: 13,
    borderWidth: 1,
    borderLeftWidth: 4,
    borderColor: theme.colors.border,
    borderLeftColor: theme.colors.border,
    gap: 8,
  },
  candCardClient: {
    borderWidth: 2,
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.cyanSoft,
  },
  candTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  candidateInfo: { flex: 1 },
  candidateNameRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  candName: { flex: 1, fontSize: 16, fontWeight: '800', color: theme.colors.text },
  orgSub: { fontSize: 14, color: theme.colors.textSecondary },
  orgName: { fontSize: 14, color: theme.colors.textSecondary },
  orgClientBadge: {
    alignSelf: 'flex-start',
    marginTop: 3,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 99,
    backgroundColor: theme.colors.cyanSoft,
    color: theme.colors.primary,
    fontSize: 11,
    fontWeight: '800',
  },
  votesCol: { alignItems: 'flex-end' },
  pctText: { fontSize: theme.typography.voteNumber, fontWeight: '800', color: theme.colors.primary },
  votesText: { fontSize: 16, color: theme.colors.textSecondary },
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
  recintoProgName: { flex: 1, fontSize: 16, fontWeight: '700', color: theme.colors.text },
  recintoProgPct: { fontSize: 18, fontWeight: '800', color: theme.colors.secondary },
  recintoProgSub: { fontSize: 14, color: theme.colors.textSecondary, marginTop: 3 },
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
  auditSub: { fontSize: 14, color: theme.colors.textSecondary, marginTop: 2 },
  gpsLine: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 4 },
  gpsOk: { fontSize: 14, fontWeight: '700', color: theme.colors.secondary },
  gpsAlert: { fontSize: 14, fontWeight: '700', color: theme.colors.danger },
});