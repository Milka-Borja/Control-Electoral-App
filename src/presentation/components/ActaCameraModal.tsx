import { CameraView, useCameraPermissions } from 'expo-camera';
import {
  AlertTriangle,
  Camera,
  CheckCircle2,
  Flashlight,
  MapPin,
  RotateCcw,
  X,
} from 'lucide-react-native';
import React, { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { GpsReading, SharpnessResult } from '../../domain/ports';
import { container } from '../../infrastructure/di/container';
import { theme } from '../theme/theme';

export interface EvidenceCapturePayload {
  photoUri: string;
  gps: GpsReading;
  sharpness: SharpnessResult;
}

interface Props {
  visible: boolean;
  onClose: () => void;
  onConfirm: (payload: EvidenceCapturePayload) => void;
}

export function ActaCameraModal({ visible, onClose, onConfirm }: Props) {
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView | null>(null);

  const [torch, setTorch] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [captureError, setCaptureError] = useState<string | null>(null);
  const [preview, setPreview] = useState<EvidenceCapturePayload | null>(null);

  const resetPreview = () => {
    setPreview(null);
    setCaptureError(null);
  };

  const handleClose = () => {
    resetPreview();
    setTorch(false);
    onClose();
  };

  const handleCapture = async () => {
    if (!cameraRef.current || analyzing) return;
    setAnalyzing(true);
    setCaptureError(null);

    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.78,
        skipProcessing: false,
      });

      if (!photo?.uri) {
        throw new Error('No se pudo capturar la imagen del acta.');
      }

      // ADR-04: validar nitidez + tomar ráfaga de lecturas GPS en paralelo
      const { sharpness, location } =
        await container.validateEvidenceCaptureUseCase.execute(photo.uri);

      setPreview({
        photoUri: photo.uri,
        gps: location,
        sharpness,
      });
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : 'Ocurrió un problema al capturar la fotografía o la ubicación GPS.';
      setCaptureError(msg);
      container.crashMonitor.captureNonFatal(err, {
        screen: 'ActaCameraModal',
        action: 'capturePhotoAndGps',
      });
    } finally {
      setAnalyzing(false);
    }
  };

  const handleConfirmPreview = () => {
    if (!preview || !preview.sharpness.isSharp) return;
    const payload = preview;
    resetPreview();
    setTorch(false);
    onConfirm(payload);
  };

  return (
    <Modal visible={visible} animationType="slide" statusBarTranslucent>
      <View style={styles.root}>
        {/* Barra superior */}
        <View style={styles.topBar}>
          <Pressable onPress={handleClose} style={styles.topBtn}>
            <X size={24} color={theme.colors.white} />
          </Pressable>
          <Text style={styles.topTitle}>Fotografía del Acta en Vivo</Text>
          {!preview ? (
            <Pressable
              onPress={() => setTorch((t) => !t)}
              style={[styles.topBtn, torch && styles.torchOn]}
            >
              <Flashlight size={22} color={theme.colors.white} />
            </Pressable>
          ) : (
            <View style={{ width: 44 }} />
          )}
        </View>

        {!permission?.granted ? (
          <View style={styles.permissionBox}>
            <Camera size={52} color={theme.colors.accent} />
            <Text style={styles.permTitle}>Permiso de cámara requerido</Text>
            <Text style={styles.permText}>
              Por seguridad electoral (ADR-04), las fotografías de actas solo pueden
              capturarse en vivo desde la aplicación.
            </Text>
            <Pressable onPress={requestPermission} style={styles.primaryBtn}>
              <Text style={styles.primaryBtnText}>Permitir acceso a la cámara</Text>
            </Pressable>
          </View>
        ) : preview ? (
          /* Vista previa obligatoria antes de confirmar (RF-11) */
          <View style={styles.previewContainer}>
            <Image
              source={{ uri: preview.photoUri }}
              style={styles.previewImage}
              resizeMode="contain"
            />

            <View style={styles.resultCard}>
              <View
                style={[
                  styles.statusRow,
                  {
                    backgroundColor: preview.sharpness.isSharp
                      ? theme.colors.secondarySoft
                      : theme.colors.dangerSoft,
                  },
                ]}
              >
                {preview.sharpness.isSharp ? (
                  <CheckCircle2 size={22} color={theme.colors.secondary} />
                ) : (
                  <AlertTriangle size={22} color={theme.colors.danger} />
                )}
                <View style={{ flex: 1 }}>
                  <Text
                    style={[
                      styles.statusTitle,
                      {
                        color: preview.sharpness.isSharp
                          ? theme.colors.secondary
                          : theme.colors.danger,
                      },
                    ]}
                  >
                    {preview.sharpness.isSharp
                      ? `Imagen nítida (nitidez: ${preview.sharpness.score} · luz: ${preview.sharpness.brightness})`
                      : `Imagen rechazada (nitidez: ${preview.sharpness.score} · luz: ${preview.sharpness.brightness})`}
                  </Text>
                  <Text style={styles.statusMsg}>{preview.sharpness.message}</Text>
                </View>
              </View>

              <View style={styles.gpsRow}>
                <MapPin size={18} color={theme.colors.primary} />
                <Text style={styles.gpsText}>
                  GPS capturado: {preview.gps.latitud.toFixed(5)},{' '}
                  {preview.gps.longitud.toFixed(5)} (±{preview.gps.precisionGps} m)
                </Text>
              </View>

              <View style={styles.previewActions}>
                <Pressable onPress={resetPreview} style={styles.retakeBtn}>
                  <RotateCcw size={20} color={theme.colors.text} />
                  <Text style={styles.retakeText}>Volver a tomar</Text>
                </Pressable>

                <Pressable
                  onPress={handleConfirmPreview}
                  disabled={!preview.sharpness.isSharp}
                  style={[
                    styles.confirmBtn,
                    !preview.sharpness.isSharp && styles.disabledBtn,
                  ]}
                >
                  <CheckCircle2 size={20} color={theme.colors.white} />
                  <Text style={styles.confirmText}>Usar foto</Text>
                </Pressable>
              </View>
            </View>
          </View>
        ) : (
          /* Visor de cámara en vivo con marco guía para acta CNE */
          <View style={styles.cameraWrap}>
            <CameraView
              ref={cameraRef}
              style={StyleSheet.absoluteFill}
              facing="back"
              enableTorch={torch}
            />

            <View style={styles.guideOverlay} pointerEvents="none">
              <View style={styles.guideFrame} />
              <Text style={styles.guideText}>
                Encuadre toda el acta de escrutinio con buena luz y mantenga firme el celular
              </Text>
            </View>

            {captureError ? (
              <View style={styles.errorBanner}>
                <AlertTriangle size={18} color={theme.colors.white} />
                <Text style={styles.errorBannerText}>{captureError}</Text>
              </View>
            ) : null}

            <View style={styles.shutterBar}>
              {analyzing ? (
                <View style={styles.analyzingBox}>
                  <ActivityIndicator size="large" color={theme.colors.accent} />
                  <Text style={styles.analyzingText}>
                    Analizando nitidez y precisión GPS...
                  </Text>
                </View>
              ) : (
                <Pressable onPress={handleCapture} style={styles.shutterBtn}>
                  <View style={styles.shutterInner} />
                </Pressable>
              )}
            </View>
          </View>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#071321',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 48,
    paddingHorizontal: 16,
    paddingBottom: 14,
    backgroundColor: theme.colors.primaryDark,
  },
  topBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.12)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  torchOn: {
    backgroundColor: theme.colors.accent,
  },
  topTitle: {
    color: theme.colors.white,
    fontSize: 17,
    fontWeight: '700',
  },
  permissionBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 28,
    gap: 14,
  },
  permTitle: {
    color: theme.colors.white,
    fontSize: 21,
    fontWeight: '800',
    textAlign: 'center',
  },
  permText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
  },
  primaryBtn: {
    marginTop: 10,
    minHeight: theme.touch.minButtonHeight,
    paddingHorizontal: 24,
    backgroundColor: theme.colors.secondary,
    borderRadius: theme.radius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  primaryBtnText: {
    color: theme.colors.white,
    fontSize: 16,
    fontWeight: '700',
  },
  cameraWrap: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  guideOverlay: {
    ...StyleSheet.absoluteFill,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingBottom: 120,
  },
  guideFrame: {
    width: '100%',
    aspectRatio: 0.72,
    borderWidth: 2.5,
    borderColor: theme.colors.accent,
    borderRadius: 16,
    backgroundColor: 'transparent',
  },
  guideText: {
    color: theme.colors.white,
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 14,
    backgroundColor: 'rgba(8,38,68,0.75)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: theme.colors.danger,
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 12,
    borderRadius: 12,
  },
  errorBannerText: {
    flex: 1,
    color: theme.colors.white,
    fontSize: 13,
    fontWeight: '600',
  },
  shutterBar: {
    height: 128,
    backgroundColor: 'rgba(8,38,68,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  shutterBtn: {
    width: 78,
    height: 78,
    borderRadius: 99,
    borderWidth: 4,
    borderColor: theme.colors.white,
    justifyContent: 'center',
    alignItems: 'center',
  },
  shutterInner: {
    width: 60,
    height: 60,
    borderRadius: 99,
    backgroundColor: theme.colors.accent,
  },
  analyzingBox: {
    alignItems: 'center',
    gap: 8,
  },
  analyzingText: {
    color: theme.colors.white,
    fontSize: 14,
    fontWeight: '600',
  },
  previewContainer: {
    flex: 1,
    justifyContent: 'space-between',
  },
  previewImage: {
    flex: 1,
    width: '100%',
    backgroundColor: '#000',
  },
  resultCard: {
    backgroundColor: theme.colors.surface,
    padding: 16,
    paddingBottom: 28,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    gap: 12,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    padding: 12,
    borderRadius: 12,
  },
  statusTitle: {
    fontSize: 15,
    fontWeight: '800',
  },
  statusMsg: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  gpsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 4,
  },
  gpsText: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.primary,
  },
  previewActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 4,
  },
  retakeBtn: {
    flex: 1,
    minHeight: theme.touch.minButtonHeight,
    borderRadius: theme.radius.md,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  retakeText: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.colors.text,
  },
  confirmBtn: {
    flex: 1,
    minHeight: theme.touch.minButtonHeight,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.secondary,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  disabledBtn: {
    backgroundColor: '#94A3B8',
  },
  confirmText: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.colors.white,
  },
});