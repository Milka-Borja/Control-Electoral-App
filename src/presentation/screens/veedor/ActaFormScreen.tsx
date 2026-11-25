import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import {
  AlertCircle,
  Camera,
  CheckCircle2,
  MapPin,
  Save,
} from 'lucide-react-native';
import React, { useEffect, useMemo, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Animated, { useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { DignidadElectoral } from '../../../domain/entities';
import { actaSchema } from '../../../domain/validators/actaSchema';
import { container } from '../../../infrastructure/di/container';
import { generateUuidV4 } from '../../../shared/uuid';
import {
  ActaCameraModal,
  EvidenceCapturePayload,
} from '../../components/ActaCameraModal';
import { AppHeader } from '../../components/AppHeader';
import { ControlledInput } from '../../components/ControlledInput';
import { PartyLogoBadge } from '../../components/PartyLogoBadge';
import {
  useActaQuery,
  useCatalogosQuery,
  useTriggerSync,
} from '../../hooks/useElectoralQueries';
import { useAuthStore } from '../../store/authStore';
import { useFeedbackStore } from '../../store/feedbackStore';
import { useSyncStore } from '../../store/syncStore';
import { getPartyColor, theme } from '../../theme/theme';

interface ActaFormValues {
  totalSufragantes: number;
  votosBlancos: number;
  votosNulos: number;
  votosPorOrg: Record<string, number>;
}

interface Props {
  mesaId: string;
  dignidad: DignidadElectoral;
  numeroJrv: string;
  recintoNombre: string;
  recintoLat: number;
  recintoLon: number;
}

export function ActaFormScreen({
  mesaId,
  dignidad,
  numeroJrv,
  recintoNombre,
  recintoLat,
  recintoLon,
}: Props) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const isOnline = useSyncStore((s) => s.isOnline);
  const triggerSync = useTriggerSync();
  const { showLoading, hideFeedback, showSuccess, showError, showWarning } =
    useFeedbackStore();

  const {
    data: catalogos,
    isLoading: catalogosLoading,
    isFetching: catalogosFetching,
    isError: catalogosError,
    error: catalogosQueryError,
    refetch: refetchCatalogos,
  } = useCatalogosQuery();
  const { data: existingActa } = useActaQuery(mesaId, dignidad);

  const organizaciones = useMemo(
    () => catalogos?.organizaciones ?? [],
    [catalogos]
  );

  const candidatosPorOrg = useMemo(() => {
    const map = new Map<string, string>();
    for (const c of catalogos?.candidatos ?? []) {
      if (c.dignidad === dignidad) {
        map.set(c.organizacionId, c.nombreCompleto);
      }
    }
    return map;
  }, [catalogos, dignidad]);

  const [cameraOpen, setCameraOpen] = useState(false);
  const [capturedPhotoUri, setCapturedPhotoUri] = useState<string | null>(null);
  const [isNewPhotoCapture, setIsNewPhotoCapture] = useState(false);
  const [referencePhotoUrl, setReferencePhotoUrl] = useState<string | null>(null);
  const [gps, setGps] = useState<{
    latitud: number;
    longitud: number;
    precisionGps: number;
  } | null>(null);
  const [sharpnessScore, setSharpnessScore] = useState<number | null>(null);

  const {
    control,
    handleSubmit,
    reset,
    watch,
    formState: { isSubmitting },
  } = useForm<ActaFormValues>({
    defaultValues: {
      totalSufragantes: 0,
      votosBlancos: 0,
      votosNulos: 0,
      votosPorOrg: {},
    },
  });

  // Precargar formulario al editar acta existente (RF-13, ADR-08)
  useEffect(() => {
    if (organizaciones.length === 0) return;

    const initialMap: Record<string, number> = {};
    for (const org of organizaciones) {
      const found = existingActa?.votos.find((v) => v.organizacionId === org.id);
      initialMap[org.id] = found ? found.cantidad : 0;
    }

    reset({
      totalSufragantes: existingActa?.totalSufragantes ?? 0,
      votosBlancos: existingActa?.votosBlancos ?? 0,
      votosNulos: existingActa?.votosNulos ?? 0,
      votosPorOrg: initialMap,
    });

    if (existingActa) {
      if (existingActa.localPhotoUri?.startsWith('file://')) {
        setCapturedPhotoUri(existingActa.localPhotoUri);
        setIsNewPhotoCapture(false);
      } else {
        setReferencePhotoUrl(existingActa.fotoSignedUrl ?? null);
      }
      setGps({
        latitud: existingActa.latitud,
        longitud: existingActa.longitud,
        precisionGps: existingActa.precisionGps,
      });
    }
  }, [organizaciones, existingActa, reset]);

  const totalSufragantes = Number(watch('totalSufragantes') || 0);
  const votosBlancos = Number(watch('votosBlancos') || 0);
  const votosNulos = Number(watch('votosNulos') || 0);
  const votosPorOrg = watch('votosPorOrg') ?? {};

  const sumaValidos = organizaciones.reduce(
    (acc, org) => acc + Number(votosPorOrg[org.id] || 0),
    0
  );
  const sumaTotal = sumaValidos + votosBlancos + votosNulos;

  const algunaListaSupera = organizaciones.some(
    (org) => Number(votosPorOrg[org.id] || 0) > totalSufragantes
  );
  const cuadreExacto =
    totalSufragantes >= 0 &&
    !algunaListaSupera &&
    sumaTotal === totalSufragantes &&
    (totalSufragantes > 0 || sumaTotal === 0);

  const progresoPct =
    totalSufragantes > 0 ? Math.min(100, (sumaTotal / totalSufragantes) * 100) : 0;

  const animatedBarStyle = useAnimatedStyle(() => ({
    width: withTiming(`${progresoPct}%`, { duration: 240 }),
    backgroundColor: cuadreExacto
      ? theme.colors.success
      : sumaTotal > totalSufragantes || algunaListaSupera
        ? theme.colors.danger
        : theme.colors.warning,
  }));

  const handleEvidenceConfirmed = (payload: EvidenceCapturePayload) => {
    setCapturedPhotoUri(payload.photoUri);
    setIsNewPhotoCapture(true);
    setGps({
      latitud: payload.gps.latitud,
      longitud: payload.gps.longitud,
      precisionGps: payload.gps.precisionGps,
    });
    setSharpnessScore(payload.sharpness.score);
    setCameraOpen(false);
  };

  const onSubmit = async (values: ActaFormValues) => {
    if (!user) return;

    if (!capturedPhotoUri || !gps) {
      showWarning(
        'Falta evidencia obligatoria',
        'Debe tomar una fotografía nítida en vivo del acta con el GPS activo antes de guardar (RF-11, RF-12, S-06).'
      );
      return;
    }

    const votosArray = organizaciones.map((org) => ({
      organizacionId: org.id,
      cantidad: Number(values.votosPorOrg[org.id] || 0),
    }));

    const candidatePayload = {
      mesaId,
      dignidad,
      totalSufragantes: Number(values.totalSufragantes || 0),
      votosBlancos: Number(values.votosBlancos || 0),
      votosNulos: Number(values.votosNulos || 0),
      votos: votosArray,
      fotoUri: capturedPhotoUri,
      latitud: gps.latitud,
      longitud: gps.longitud,
      precisionGps: gps.precisionGps,
      baseVersion: existingActa?.version ?? 0,
    };

    // Validación centralizada con Zod (ADR-09, RF-10, RF-19, S-03)
    const validation = actaSchema.safeParse(candidatePayload);
    if (!validation.success) {
      const firstIssue = validation.error.issues[0]?.message ?? 'Datos del acta inválidos';
      showWarning('Acta bloqueada por inconsistencia', firstIssue);
      return;
    }

    showLoading(
      'Guardando acta...',
      isOnline
        ? 'Registrando en SQLite y enviando al servidor'
        : 'Guardando de forma segura sin conexión en el celular'
    );

    try {
      const clientUuid = generateUuidV4();
      await container.saveActaOfflineUseCase.execute({
        input: validation.data,
        clientUuid,
        recintoLatitud: recintoLat,
        recintoLongitud: recintoLon,
        usuarioId: user.id,
        isNewPhotoCapture,
      });

      const syncSummary = await triggerSync();
      await queryClient.invalidateQueries();
      hideFeedback();

      if (syncSummary.conflictos > 0) {
        showWarning(
          'Conflicto de versión detectado',
          'Esta acta ya había sido modificada en otro dispositivo. Se conservaron ambas versiones y se notificó al Coordinador de Recinto (S-04).',
          () => router.back()
        );
      } else if (syncSummary.enviados > 0) {
        showSuccess(
          'Acta enviada y confirmada',
          'Los resultados y la evidencia GPS fueron sincronizados correctamente.',
          () => router.back()
        );
      } else {
        showSuccess(
          'Acta guardada localmente',
          'Quedó respaldada en SQLite con su fotografía y GPS. Se enviará automáticamente al recuperar conexión.',
          () => router.back()
        );
      }
    } catch (err) {
      hideFeedback();
      container.crashMonitor.captureNonFatal(err, {
        screen: 'ActaFormScreen',
        action: 'saveActaOffline',
        extra: { dignidad },
      });
      showError(
        'No se pudo guardar el acta',
        err instanceof Error ? err.message : 'Intente nuevamente'
      );
    }
  };

  return (
    <View style={styles.root}>
      <AppHeader
        title={`Acta de ${dignidad === 'ALCALDIA' ? 'Alcaldía' : 'Prefectura'}`}
        subtitle={`JRV N.° ${numeroJrv} · ${recintoNombre}`}
        showBack
      />

      {/* Barra de cuadre matemático en vivo (RF-10, RF-19, S-03, RNF-06) */}
      <View style={styles.mathBanner}>
        <View style={styles.mathTop}>
          <View style={styles.mathLabelRow}>
            {cuadreExacto ? (
              <CheckCircle2 size={18} color={theme.colors.success} />
            ) : (
              <AlertCircle size={18} color={theme.colors.danger} />
            )}
            <Text
              style={[
                styles.mathTitle,
                { color: cuadreExacto ? theme.colors.success : theme.colors.danger },
              ]}
            >
              {algunaListaSupera
                ? 'Una lista supera el total de sufragantes'
                : cuadreExacto
                  ? 'Cuadre matemático exacto'
                  : sumaTotal > totalSufragantes
                    ? `Sobran ${sumaTotal - totalSufragantes} votos`
                    : `Faltan ${totalSufragantes - sumaTotal} votos por cuadrar`}
            </Text>
          </View>
          <Text style={styles.mathNumbers}>
            {sumaTotal} / {totalSufragantes}
          </Text>
        </View>
        <View style={styles.progressTrack}>
          <Animated.View style={[styles.progressFill, animatedBarStyle]} />
        </View>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
        >
          {/* Paso 1: Totales del acta */}
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>1. Totales del Acta de Escrutinio</Text>
            <ControlledInput
              control={control}
              name="totalSufragantes"
              label="Total de sufragantes (firmas y huellas)"
              numeric
              placeholder="0"
            />
            <View style={styles.twoCols}>
              <View style={{ flex: 1 }}>
                <ControlledInput
                  control={control}
                  name="votosBlancos"
                  label="Votos en blanco"
                  numeric
                  placeholder="0"
                />
              </View>
              <View style={{ flex: 1 }}>
                <ControlledInput
                  control={control}
                  name="votosNulos"
                  label="Votos nulos"
                  numeric
                  placeholder="0"
                />
              </View>
            </View>
          </View>

          {/* Paso 2: Votos por cada una de las 5 organizaciones */}
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>2. Votos por Organización Política</Text>
            {catalogosLoading ? (
              <ActivityIndicator color={theme.colors.primary} />
            ) : organizaciones.length === 0 ? (
              <View style={styles.catalogEmpty}>
                <Text style={styles.catalogEmptyText}>
                  {catalogosError
                    ? catalogosQueryError instanceof Error
                      ? `No se pudieron cargar las organizaciones: ${catalogosQueryError.message}`
                      : 'No se pudieron cargar las organizaciones.'
                    : 'No hay organizaciones disponibles para registrar los votos.'}
                </Text>
                <Pressable
                  onPress={() => void refetchCatalogos()}
                  disabled={catalogosFetching}
                  style={styles.catalogRetryBtn}
                >
                  {catalogosFetching ? (
                    <ActivityIndicator size="small" color={theme.colors.white} />
                  ) : (
                    <Text style={styles.catalogRetryText}>Reintentar carga</Text>
                  )}
                </Pressable>
              </View>
            ) : organizaciones.map((org) => {
              const candName = candidatosPorOrg.get(org.id) ?? 'Candidato';
              const val = Number(votosPorOrg[org.id] || 0);
              const excede = val > totalSufragantes;
              const partyColor = getPartyColor(
                org.numeroLista,
                org.sigla,
                org.colorHex,
              );

              return (
                <View
                  key={org.id}
                  style={[
                    styles.orgRow,
                    org.esCliente && styles.orgRowClient,
                    { borderColor: partyColor },
                  ]}
                >
                  <View
                    style={[
                      styles.orgStripe,
                      { backgroundColor: partyColor },
                    ]}
                  />
                  <PartyLogoBadge
                    numeroLista={org.numeroLista}
                    sigla={org.sigla}
                    size={42}
                  />
                  <View style={styles.orgInfo}>
                    <Text
                      style={[
                        styles.orgLista,
                        { color: partyColor, borderColor: partyColor },
                      ]}
                    >
                      Lista {org.numeroLista} · {org.sigla}
                    </Text>
                    <Text style={styles.orgName} numberOfLines={1}>
                      {org.nombre}
                    </Text>
                    {org.esCliente ? (
                      <Text style={styles.orgClientBadge}>
                        LISTA 21 · CREO
                      </Text>
                    ) : null}
                    <Text style={styles.candName} numberOfLines={1}>
                      {candName}
                    </Text>
                    {excede ? (
                      <Text style={styles.excedeText}>
                        Supera total de sufragantes ({totalSufragantes})
                      </Text>
                    ) : null}
                  </View>

                  <Controller
                    control={control}
                    name={`votosPorOrg.${org.id}`}
                    render={({ field: { onChange, value } }) => (
                      <TextInput
                        value={value === undefined ? '0' : String(value)}
                        onChangeText={(txt) => {
                          const digits = txt.replace(/[^0-9]/g, '');
                          onChange(digits === '' ? 0 : parseInt(digits, 10));
                        }}
                        keyboardType="number-pad"
                        style={[styles.voteInput, excede && styles.voteInputError]}
                        selectTextOnFocus
                      />
                    )}
                  />
                </View>
              );
            })}
          </View>

          {/* Paso 3: Fotografía en vivo y geolocalización (ADR-04, RF-11, RF-12) */}
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>3. Evidencia Fotográfica y GPS</Text>
            <Text style={styles.photoHint}>
              Solo se permite captura en vivo. El sistema verifica automáticamente la nitidez y la ubicación GPS.
            </Text>

            {capturedPhotoUri ? (
              <View style={styles.photoPreviewBox}>
                <Image source={{ uri: capturedPhotoUri }} style={styles.photoThumb} />
                <View style={styles.photoMeta}>
                  <View style={styles.gpsBadge}>
                    <MapPin size={15} color={theme.colors.secondary} />
                    <Text style={styles.gpsBadgeText}>
                      GPS ±{gps?.precisionGps ?? 0} m
                      {sharpnessScore ? ` · Nitidez ${sharpnessScore}` : ''}
                    </Text>
                  </View>
                  <Pressable onPress={() => setCameraOpen(true)} style={styles.retakeSmallBtn}>
                    <Camera size={16} color={theme.colors.primary} />
                    <Text style={styles.retakeSmallText}>Tomar otra foto</Text>
                  </Pressable>
                </View>
              </View>
            ) : (
              <View style={{ gap: 10 }}>
                {referencePhotoUrl ? (
                  <View style={styles.refNotice}>
                    <Text style={styles.refNoticeText}>
                      Esta acta fue registrada en otro dispositivo. Para guardar una corrección, capture una nueva foto en vivo de respaldo.
                    </Text>
                  </View>
                ) : null}
                <Pressable onPress={() => setCameraOpen(true)} style={styles.cameraBtn}>
                  <Camera size={22} color={theme.colors.white} />
                  <Text style={styles.cameraBtnText}>Abrir cámara y capturar acta</Text>
                </Pressable>
              </View>
            )}
          </View>

          {/* Botón final con bloqueo estricto si las matemáticas no cuadran (S-03, ADR-08) */}
          <Pressable
            onPress={handleSubmit(onSubmit)}
            disabled={isSubmitting || !cuadreExacto}
            style={[
              styles.saveBtn,
              (!cuadreExacto || isSubmitting) && styles.saveBtnDisabled,
            ]}
          >
            <Save size={21} color={theme.colors.white} />
            <Text style={styles.saveBtnText}>
              {isSubmitting
                ? 'Procesando acta...'
                : existingActa
                  ? 'Guardar corrección del acta'
                  : 'Confirmar y guardar acta'}
            </Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>

      <ActaCameraModal
        visible={cameraOpen}
        onClose={() => setCameraOpen(false)}
        onConfirm={handleEvidenceConfirmed}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.colors.background },
  mathBanner: {
    backgroundColor: theme.colors.surface,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  mathTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  mathLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 },
  mathTitle: { fontSize: 16, fontWeight: '800' },
  mathNumbers: { fontSize: theme.typography.voteNumber, fontWeight: '800', color: theme.colors.primary },
  progressTrack: {
    height: 8,
    backgroundColor: theme.colors.surfaceAlt,
    borderRadius: 99,
    overflow: 'hidden',
  },
  progressFill: { height: '100%', borderRadius: 99 },
  scroll: { paddingHorizontal: 16, paddingTop: 14, gap: 12, paddingBottom: 120 },
  sectionCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderLeftWidth: 5,
    borderLeftColor: theme.colors.primary,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: theme.colors.primary,
    marginBottom: 12,
  },
  catalogEmpty: {
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
  },
  catalogEmptyText: {
    color: theme.colors.textSecondary,
    fontSize: 14,
    textAlign: 'center',
  },
  catalogRetryBtn: {
    minHeight: 42,
    paddingHorizontal: 16,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  catalogRetryText: {
    color: theme.colors.white,
    fontSize: 14,
    fontWeight: '700',
  },
  twoCols: { flexDirection: 'row', gap: 12 },
  orgRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 8,
    marginBottom: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  orgRowClient: {
    borderWidth: 2,
    borderColor: theme.colors.primary,
    borderLeftColor: theme.colors.cyan,
    backgroundColor: theme.colors.cyanSoft,
  },
  orgStripe: { width: 8, height: 54, borderRadius: 6 },
  orgInfo: { flex: 1 },
  orgLista: {
    alignSelf: 'flex-start',
    fontSize: 14,
    fontWeight: '800',
    color: theme.colors.textMuted,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderRadius: 99,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  orgName: { fontSize: 16, fontWeight: '700', color: theme.colors.text },
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
  candName: { fontSize: 14, color: theme.colors.textSecondary },
  excedeText: { fontSize: 14, fontWeight: '700', color: theme.colors.danger, marginTop: 2 },
  voteInput: {
    width: 84,
    height: 54,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    borderRadius: 12,
    backgroundColor: theme.colors.background,
    textAlign: 'center',
    fontSize: 22,
    fontWeight: '800',
    color: theme.colors.primary,
  },
  voteInputError: {
    borderColor: theme.colors.danger,
    backgroundColor: theme.colors.dangerSoft,
    color: theme.colors.danger,
  },
  photoHint: {
    fontSize: 16,
    color: theme.colors.textSecondary,
    marginBottom: 12,
    lineHeight: 23,
  },
  cameraBtn: {
    minHeight: theme.touch.minButtonHeight,
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radius.md,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
  },
  cameraBtnText: { color: theme.colors.white, fontSize: 16, fontWeight: '700' },
  photoPreviewBox: { gap: 10 },
  photoThumb: {
    width: '100%',
    height: 220,
    borderRadius: 12,
    backgroundColor: '#000',
  },
  photoMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  gpsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: theme.colors.secondarySoft,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 99,
  },
  gpsBadgeText: { fontSize: 12, fontWeight: '700', color: theme.colors.secondary },
  retakeSmallBtn: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: theme.colors.primary,
  },
  retakeSmallText: { fontSize: 14, fontWeight: '700', color: theme.colors.primary },
  refNotice: {
    backgroundColor: theme.colors.warningSoft,
    padding: 10,
    borderRadius: 10,
  },
  refNoticeText: { fontSize: 14, color: theme.colors.warning, fontWeight: '600' },
  saveBtn: {
    minHeight: 58,
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radius.md,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
    elevation: 3,
  },
  saveBtnDisabled: { backgroundColor: '#94A3B8' },
  saveBtnText: { color: theme.colors.white, fontSize: 17, fontWeight: '800' },
});