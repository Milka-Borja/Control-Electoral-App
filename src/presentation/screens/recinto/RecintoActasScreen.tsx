import { useRouter, type Href } from 'expo-router';
import { Edit3, FileText } from 'lucide-react-native';
import React from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { ActaAuditoria } from '../../../domain/entities';
import { AppHeader } from '../../components/AppHeader';
import { StatusBadge } from '../../components/StatusBadge';
import { useActasRecintoQuery } from '../../hooks/useElectoralQueries';
import { theme } from '../../theme/theme';

export function RecintoActasScreen() {
  const router = useRouter();
  const { data: actas = [], refetch, isRefetching } = useActasRecintoQuery();

  const renderActa = ({ item }: { item: ActaAuditoria }) => (
    <View style={styles.card}>
      <View style={styles.topRow}>
        <Text style={styles.title}>
          JRV N.° {item.numeroJrv} ·{' '}
          {item.dignidad === 'ALCALDIA' ? 'Alcaldía' : 'Prefectura'}
        </Text>
        <StatusBadge status="ENVIADO" />
      </View>

      <Text style={styles.meta}>
        Sufragantes: {item.totalSufragantes} · Blancos: {item.votosBlancos} · Nulos:{' '}
        {item.votosNulos} · v{item.version}
      </Text>
      <Text style={styles.sub}>
        Registrado por: {item.registradoPorNombre ?? 'Veedor'} · Distancia GPS:{' '}
        {item.distanciaRecintoM} m
      </Text>

      <Pressable
        onPress={() =>
          router.push({
            pathname: '/(recinto)/editar-acta',
            params: {
              mesaId: item.mesaId,
              dignidad: item.dignidad,
              numeroJrv: String(item.numeroJrv),
              recintoNombre: item.recintoNombre,
              recintoLat: String(item.recintoLatitud),
              recintoLon: String(item.recintoLongitud),
            },
          } as unknown as Href)
        }
        style={styles.editBtn}
      >
        <Edit3 size={17} color={theme.colors.white} />
        <Text style={styles.editBtnText}>Corregir resultados del acta</Text>
      </Pressable>
    </View>
  );

  return (
    <View style={styles.root}>
      <AppHeader
        title="Actas del Recinto"
        subtitle="Consulta y corrección autorizada (RF-13)"
        showBack
      />
      <FlatList
        data={actas}
        keyExtractor={(a) => a.id ?? a.clientUuid}
        renderItem={renderActa}
        contentContainerStyle={styles.list}
        refreshing={isRefetching}
        onRefresh={refetch}
        ListEmptyComponent={
          <View style={styles.emptyBox}>
            <FileText size={44} color={theme.colors.textMuted} />
            <Text style={styles.emptyTitle}>Aún no hay actas enviadas</Text>
            <Text style={styles.emptyDesc}>
              Las actas subidas por los veedores de su recinto aparecerán aquí.
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.colors.background },
  list: { padding: theme.spacing.md, gap: 12 },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    padding: 15,
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: 6,
  },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: 16, fontWeight: '800', color: theme.colors.primary },
  meta: { fontSize: 14, fontWeight: '600', color: theme.colors.text },
  sub: { fontSize: 12, color: theme.colors.textSecondary },
  editBtn: {
    minHeight: 46,
    backgroundColor: theme.colors.primary,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginTop: 6,
  },
  editBtnText: { color: theme.colors.white, fontSize: 14, fontWeight: '700' },
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