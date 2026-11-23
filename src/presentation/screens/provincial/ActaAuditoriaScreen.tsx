import { AlertTriangle, CheckCircle2, Lock } from 'lucide-react-native';
import React from 'react';
import { Image, ScrollView, StyleSheet, Text, View } from 'react-native';
import { AppHeader } from '../../components/AppHeader';
import { MapAuditView } from '../../components/MapAuditView';
import {
  useActaAuditoriaByIdQuery,
  useCatalogosQuery,
} from '../../hooks/useElectoralQueries';
import { theme } from '../../theme/theme';

interface Props {
  actaId: string;
}

export function ActaAuditoriaScreen({ actaId }: Props) {
  const { data: acta, isLoading } = useActaAuditoriaByIdQuery(actaId);
  const { data: catalogos } = useCatalogosQuery();

  const orgMap = new Map(
    (catalogos?.organizaciones ?? []).map((o) => [
      o.id,
      { label: `Lista ${o.numeroLista} · ${o.sigla} (${o.nombre})`, color: o.colorHex },
    ])
  );

  return (
    <View style={styles.root}>
      <AppHeader
        title="Auditoría de Acta"
        subtitle="Solo lectura · Evidencia y GPS (ADR-11)"
        showBack
      />

      {isLoading || !acta ? (
        <View style={styles.centerBox}>
          <Text style={styles.loadingText}>Cargando evidencia del acta...</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scroll}>
          {/* Banner de solo lectura (ADR-11) */}
          <View style={styles.readOnlyBanner}>
            <Lock size={16} color={theme.colors.primary} />
            <Text style={styles.readOnlyText}>
              Modo solo lectura: el coordinador provincial audita resultados sin modificar actas (ADR-11).
            </Text>
          </View>

          {/* Alerta visual > 300 m (S-06) */}
          <View
            style={[
              styles.geoAlertBox,
              {
                backgroundColor: acta.alertaUbicacion
                  ? theme.colors.dangerSoft
                  : theme.colors.secondarySoft,
                borderColor: acta.alertaUbicacion
                  ? theme.colors.danger
                  : theme.colors.secondary,
              },
            ]}
          >
            {acta.alertaUbicacion ? (
              <AlertTriangle size={24} color={theme.colors.danger} />
            ) : (
              <CheckCircle2 size={24} color={theme.colors.secondary} />
            )}
            <View style={{ flex: 1 }}>
              <Text
                style={[
                  styles.geoTitle,
                  {
                    color: acta.alertaUbicacion
                      ? theme.colors.danger
                      : theme.colors.secondary,
                  },
                ]}
              >
                {acta.alertaUbicacion
                  ? `ALERTA DE UBICACIÓN: ${acta.distanciaRecintoM} m del recinto`
                  : `Ubicación verificada dentro del recinto (${acta.distanciaRecintoM} m)`}
              </Text>
              <Text style={styles.geoSub}>
                Umbral de referencia: 300 m · Precisión GPS: ±{acta.precisionGps} m
              </Text>
            </View>
          </View>

          {/* Mapa GPS del recinto vs punto de captura (RF-12, RF-15, S-06) */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>
              Geolocalización de Captura vs. {acta.recintoNombre}
            </Text>
            <MapAuditView
              recintoNombre={acta.recintoNombre}
              recintoLat={acta.recintoLatitud}
              recintoLon={acta.recintoLongitud}
              actaLat={acta.latitud}
              actaLon={acta.longitud}
              alertaUbicacion={acta.alertaUbicacion}
            />
          </View>

          {/* Fotografía del acta */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>
              Fotografía de Respaldo · JRV N.° {acta.numeroJrv} (
              {acta.dignidad === 'ALCALDIA' ? 'Alcaldía' : 'Prefectura'})
            </Text>
            {acta.fotoSignedUrl ? (
              <Image
                source={{ uri: acta.fotoSignedUrl }}
                style={styles.photo}
                resizeMode="contain"
              />
            ) : (
              <Text style={styles.noPhoto}>Fotografía no disponible</Text>
            )}
          </View>

          {/* Desglose de votos */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Desglose Oficial (Versión v{acta.version})</Text>
            <Text style={styles.totLine}>
              Total de sufragantes: <Text style={styles.bold}>{acta.totalSufragantes}</Text>
            </Text>
            <Text style={styles.totLine}>
              Blancos: <Text style={styles.bold}>{acta.votosBlancos}</Text> · Nulos:{' '}
              <Text style={styles.bold}>{acta.votosNulos}</Text>
            </Text>
            <View style={styles.divider} />
            {acta.votos.map((v) => {
              const info = orgMap.get(v.organizacionId);
              return (
                <View key={v.organizacionId} style={styles.voteRow}>
                  <View
                    style={[
                      styles.dot,
                      { backgroundColor: info?.color ?? theme.colors.primary },
                    ]}
                  />
                  <Text style={styles.orgLabel} numberOfLines={1}>
                    {info?.label ?? 'Organización'}
                  </Text>
                  <Text style={styles.voteVal}>{v.cantidad}</Text>
                </View>
              );
            })}
          </View>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.colors.background },
  centerBox: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { fontSize: 15, color: theme.colors.textSecondary },
  scroll: { padding: theme.spacing.md, gap: 14, paddingBottom: 36 },
  readOnlyBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: theme.colors.infoSoft,
    padding: 12,
    borderRadius: 12,
  },
  readOnlyText: { flex: 1, fontSize: 13, fontWeight: '600', color: theme.colors.primary },
  geoAlertBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1.5,
  },
  geoTitle: { fontSize: 15, fontWeight: '800' },
  geoSub: { fontSize: 12, color: theme.colors.textSecondary, marginTop: 2 },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    padding: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: 10,
  },
  cardTitle: { fontSize: 16, fontWeight: '800', color: theme.colors.primary },
  photo: { width: '100%', height: 300, borderRadius: 12, backgroundColor: '#000' },
  noPhoto: { fontSize: 14, color: theme.colors.textMuted },
  totLine: { fontSize: 15, color: theme.colors.text },
  bold: { fontWeight: '800', color: theme.colors.primary },
  divider: { height: 1, backgroundColor: theme.colors.surfaceAlt, marginVertical: 4 },
  voteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 6,
  },
  dot: { width: 12, height: 12, borderRadius: 99 },
  orgLabel: { flex: 1, fontSize: 14, color: theme.colors.text },
  voteVal: { fontSize: 17, fontWeight: '800', color: theme.colors.primary },
});