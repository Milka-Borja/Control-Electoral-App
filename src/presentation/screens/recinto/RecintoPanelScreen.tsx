import { useRouter } from 'expo-router';
import {
  AlertTriangle,
  ChevronRight,
  ClipboardCheck,
  FileSpreadsheet,
  GitMerge,
  UserPlus,
} from 'lucide-react-native';
import React from 'react';
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { AppHeader } from '../../components/AppHeader';
import {
  useConflictosPendientesQuery,
  useEscrutinioRealtimeSync,
  usePanelRecintoQuery,
} from '../../hooks/useElectoralQueries';
import { useAuthStore } from '../../store/authStore';
import { theme } from '../../theme/theme';

export function RecintoPanelScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  useEscrutinioRealtimeSync();

  const { data, refetch, isRefetching } = usePanelRecintoQuery();
  const { data: conflictos = [] } = useConflictosPendientesQuery();

  const recinto = data?.recinto;
  const mesas = data?.mesas ?? [];
  const veedores = data?.veedores ?? [];

  const completas = mesas.filter((m) => m.avance === 'COMPLETA').length;
  const parciales = mesas.filter((m) => m.avance === 'PARCIAL').length;
  const pendientes = mesas.filter((m) => !m.avance || m.avance === 'PENDIENTE').length;

  return (
    <View style={styles.root}>
      <AppHeader
        title="Coordinación de Recinto"
        subtitle={recinto ? recinto.nombre : `${user?.nombres ?? ''} ${user?.apellidos ?? ''}`}
        showLogout
      />

      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            colors={[theme.colors.primary]}
          />
        }
      >
        {!recinto ? (
          <View style={styles.warnCard}>
            <AlertTriangle size={24} color={theme.colors.warning} />
            <Text style={styles.warnTitle}>Sin recinto asignado todavía</Text>
            <Text style={styles.warnText}>
              Solicite al Coordinador Provincial que lo asigne como responsable de su recinto electoral.
            </Text>
          </View>
        ) : (
          <View style={styles.recintoCard}>
            <Text style={styles.recintoBadge}>PARROQUIA {recinto.parroquia.toUpperCase()}</Text>
            <Text style={styles.recintoName}>{recinto.nombre}</Text>
            <Text style={styles.recintoSub}>
              {mesas.length} JRV · {veedores.length} veedor{veedores.length === 1 ? '' : 'es'} activos
            </Text>
          </View>
        )}

        {/* Alerta destacada de conflictos de versión offline (S-04) */}
        {conflictos.length > 0 ? (
          <Pressable
            onPress={() => router.push('/(recinto)/conflictos')}
            style={styles.conflictAlert}
          >
            <GitMerge size={24} color={theme.colors.white} />
            <View style={{ flex: 1 }}>
              <Text style={styles.conflictTitle}>
                {conflictos.length} conflicto{conflictos.length === 1 ? '' : 's'} de versión pendiente{conflictos.length === 1 ? '' : 's'}
              </Text>
              <Text style={styles.conflictSub}>
                Toque aquí para comparar versiones y decidir cuál prevalece (S-04)
              </Text>
            </View>
            <ChevronRight size={22} color={theme.colors.white} />
          </Pressable>
        ) : null}

        {/* KPIs de avance del recinto (S-02) */}
        <View style={styles.kpiRow}>
          <View style={[styles.kpiBox, { borderTopColor: theme.colors.secondary }]}>
            <Text style={[styles.kpiNum, { color: theme.colors.secondary }]}>{completas}</Text>
            <Text style={styles.kpiLabel}>Completas</Text>
          </View>
          <View style={[styles.kpiBox, { borderTopColor: theme.colors.warning }]}>
            <Text style={[styles.kpiNum, { color: theme.colors.warning }]}>{parciales}</Text>
            <Text style={styles.kpiLabel}>Parciales</Text>
          </View>
          <View style={[styles.kpiBox, { borderTopColor: theme.colors.textMuted }]}>
            <Text style={[styles.kpiNum, { color: theme.colors.text }]}>{pendientes}</Text>
            <Text style={styles.kpiLabel}>Faltantes</Text>
          </View>
        </View>

        {/* Accesos directos de gestión */}
        <Pressable
          onPress={() => router.push('/(recinto)/mesas')}
          style={styles.menuCard}
        >
          <View style={[styles.menuIcon, { backgroundColor: theme.colors.infoSoft }]}>
            <ClipboardCheck size={24} color={theme.colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.menuTitle}>Mesas y Reemplazo de Veedores</Text>
            <Text style={styles.menuDesc}>
              Asignar múltiples mesas o sustituir veedor ausente al instante (RF-08, RF-20)
            </Text>
          </View>
          <ChevronRight size={20} color={theme.colors.primary} />
        </Pressable>

        <Pressable
          onPress={() => router.push('/(recinto)/veedores')}
          style={styles.menuCard}
        >
          <View style={[styles.menuIcon, { backgroundColor: theme.colors.secondarySoft }]}>
            <UserPlus size={24} color={theme.colors.secondary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.menuTitle}>Registrar Veedores</Text>
            <Text style={styles.menuDesc}>
              Crear cuentas con validación de cédula EC y correo de confirmación (RF-01, RF-02)
            </Text>
          </View>
          <ChevronRight size={20} color={theme.colors.primary} />
        </Pressable>

        <Pressable
          onPress={() => router.push('/(recinto)/actas')}
          style={styles.menuCard}
        >
          <View style={[styles.menuIcon, { backgroundColor: theme.colors.accentSoft }]}>
            <FileSpreadsheet size={24} color={theme.colors.warning} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.menuTitle}>Actas del Recinto</Text>
            <Text style={styles.menuDesc}>
              Revisar resultados y corregir actas de su recinto (RF-13)
            </Text>
          </View>
          <ChevronRight size={20} color={theme.colors.primary} />
        </Pressable>

        <Pressable
          onPress={() => router.push('/(recinto)/conflictos')}
          style={styles.menuCard}
        >
          <View style={[styles.menuIcon, { backgroundColor: theme.colors.conflictSoft }]}>
            <GitMerge size={24} color={theme.colors.conflict} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.menuTitle}>Resolución de Conflictos ({conflictos.length})</Text>
            <Text style={styles.menuDesc}>
              Comparar ediciones offline simultáneas y elegir versión oficial (S-04)
            </Text>
          </View>
          <ChevronRight size={20} color={theme.colors.primary} />
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.colors.background },
  scroll: { padding: theme.spacing.md, gap: 14, paddingBottom: 32 },
  recintoCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    padding: 16,
    borderLeftWidth: 5,
    borderLeftColor: theme.colors.primary,
    elevation: 2,
  },
  recintoBadge: {
    fontSize: 11,
    fontWeight: '800',
    color: theme.colors.secondary,
    letterSpacing: 0.6,
  },
  recintoName: { fontSize: 19, fontWeight: '800', color: theme.colors.text, marginTop: 4 },
  recintoSub: { fontSize: 13, color: theme.colors.textSecondary, marginTop: 4 },
  warnCard: {
    backgroundColor: theme.colors.warningSoft,
    padding: 16,
    borderRadius: theme.radius.md,
    gap: 6,
  },
  warnTitle: { fontSize: 16, fontWeight: '800', color: theme.colors.warning },
  warnText: { fontSize: 14, color: theme.colors.text },
  conflictAlert: {
    backgroundColor: theme.colors.conflict,
    borderRadius: theme.radius.md,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    elevation: 3,
  },
  conflictTitle: { color: theme.colors.white, fontSize: 15, fontWeight: '800' },
  conflictSub: { color: 'rgba(255,255,255,0.88)', fontSize: 12, marginTop: 2 },
  kpiRow: { flexDirection: 'row', gap: 10 },
  kpiBox: {
    flex: 1,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    padding: 14,
    alignItems: 'center',
    borderTopWidth: 4,
    elevation: 2,
  },
  kpiNum: { fontSize: 24, fontWeight: '800' },
  kpiLabel: { fontSize: 12, fontWeight: '700', color: theme.colors.textSecondary, marginTop: 2 },
  menuCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    padding: 15,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
    elevation: 2,
  },
  menuIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuTitle: { fontSize: 16, fontWeight: '800', color: theme.colors.text },
  menuDesc: { fontSize: 13, color: theme.colors.textSecondary, marginTop: 2, lineHeight: 18 },
});