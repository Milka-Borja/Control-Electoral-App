import { useRouter } from 'expo-router';
import { Building2, Edit3, FilePlus2, Landmark } from 'lucide-react-native';
import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { DignidadElectoral } from '../../../domain/entities';
import { AppHeader } from '../../components/AppHeader';
import { StatusBadge } from '../../components/StatusBadge';
import { useActaQuery } from '../../hooks/useElectoralQueries';
import { theme } from '../../theme/theme';

interface Props {
  mesaId: string;
  numeroJrv: string;
  genero: string;
  recintoNombre: string;
  recintoLat: string;
  recintoLon: string;
}

export function MesaDetalleScreen({
  mesaId,
  numeroJrv,
  genero,
  recintoNombre,
  recintoLat,
  recintoLon,
}: Props) {
  const router = useRouter();
  const { data: actaAlcaldia } = useActaQuery(mesaId, 'ALCALDIA');
  const { data: actaPrefectura } = useActaQuery(mesaId, 'PREFECTURA');

  const abrirFormulario = (dignidad: DignidadElectoral) => {
    router.push({
      pathname: '/(veedor)/acta-form',
      params: {
        mesaId,
        dignidad,
        numeroJrv,
        recintoNombre,
        recintoLat,
        recintoLon,
      },
    });
  };

  const renderActaCard = (
    dignidad: DignidadElectoral,
    titulo: string,
    subtitulo: string,
    accent: string,
    IconComponent: typeof Building2,
    acta: ReturnType<typeof useActaQuery>['data']
  ) => (
    <View style={[styles.card, { borderLeftColor: accent }]}>
      <View style={styles.cardTop}>
        <View style={[styles.iconBox, { backgroundColor: `${accent}18` }]}>
          <IconComponent size={26} color={accent} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.cardTitle}>{titulo}</Text>
          <Text style={styles.cardSub}>{subtitulo}</Text>
        </View>
        <StatusBadge status={acta?.syncStatus ?? 'PENDIENTE'} />
      </View>

      {acta ? (
        <View style={styles.statsBox}>
          <Text style={styles.statLine}>
            Sufragantes: <Text style={styles.statBold}>{acta.totalSufragantes}</Text> · Blancos:{' '}
            <Text style={styles.statBold}>{acta.votosBlancos}</Text> · Nulos:{' '}
            <Text style={styles.statBold}>{acta.votosNulos}</Text>
          </Text>
          <Text style={styles.statSub}>
            Versión v{acta.version} · Distancia al recinto: {acta.distanciaRecintoM} m
            {acta.alertaUbicacion ? ' (Fuera de 300 m)' : ' (Dentro de 300 m)'}
          </Text>
          {acta.errorMessage ? (
            <Text style={styles.errorText}>{acta.errorMessage}</Text>
          ) : null}
        </View>
      ) : (
        <Text style={styles.pendingNote}>
          Aún no se ha registrado esta acta. Recuerde tener el acta física a mano para fotografiarla.
        </Text>
      )}

      <Pressable
        onPress={() => abrirFormulario(dignidad)}
        style={[styles.actionBtn, { backgroundColor: acta ? theme.colors.primary : accent }]}
      >
        {acta ? (
          <Edit3 size={19} color={theme.colors.white} />
        ) : (
          <FilePlus2 size={19} color={theme.colors.white} />
        )}
        <Text style={styles.actionBtnText}>
          {acta ? 'Corregir / Editar Acta' : `Registrar Acta de ${titulo}`}
        </Text>
      </Pressable>
    </View>
  );

  return (
    <View style={styles.root}>
      <AppHeader
        title={`Mesa JRV N.° ${numeroJrv} (${genero === 'M' ? 'Hombres' : 'Mujeres'})`}
        subtitle={recintoNombre}
        showBack
      />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.infoBanner}>
          Una mesa se considera completa únicamente cuando se registran ambas actas: Alcaldía y Prefectura.
        </Text>

        {renderActaCard(
          'ALCALDIA',
          'Alcaldía',
          'Cantón Quito · 5 organizaciones políticas',
          theme.colors.primary,
          Building2,
          actaAlcaldia
        )}

        {renderActaCard(
          'PREFECTURA',
          'Prefectura',
          'Provincia de Pichincha · 5 organizaciones políticas',
          theme.colors.secondary,
          Landmark,
          actaPrefectura
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.colors.background },
  content: { paddingHorizontal: 16, paddingTop: 14, gap: 12, paddingBottom: 16 },
  infoBanner: {
    backgroundColor: theme.colors.accentSoft,
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.accent,
    padding: 12,
    borderRadius: 10,
    fontSize: 14,
    color: theme.colors.text,
    lineHeight: 20,
  },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    padding: 16,
    borderLeftWidth: 5,
    elevation: 2,
    gap: 12,
  },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardTitle: { fontSize: 19, fontWeight: '800', color: theme.colors.text },
  cardSub: { fontSize: 13, color: theme.colors.textSecondary },
  statsBox: {
    backgroundColor: theme.colors.surfaceAlt,
    padding: 12,
    borderRadius: 12,
    gap: 4,
  },
  statLine: { fontSize: 14, color: theme.colors.text },
  statBold: { fontWeight: '800', color: theme.colors.primary },
  statSub: { fontSize: 12, color: theme.colors.textSecondary },
  errorText: { fontSize: 12, fontWeight: '700', color: theme.colors.danger, marginTop: 4 },
  pendingNote: { fontSize: 14, color: theme.colors.textSecondary, lineHeight: 20 },
  actionBtn: {
    minHeight: theme.touch.minButtonHeight,
    borderRadius: theme.radius.md,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
  },
  actionBtnText: { color: theme.colors.white, fontSize: 16, fontWeight: '700' },
});