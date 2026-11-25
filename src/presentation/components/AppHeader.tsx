import { useRouter } from 'expo-router';
import { ArrowLeft, LogOut } from 'lucide-react-native';
import React, { useRef } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Line } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { container } from '../../infrastructure/di/container';
import { useAuthStore } from '../store/authStore';
import { useFeedbackStore } from '../store/feedbackStore';
import { theme } from '../theme/theme';
import { OfflineBanner } from './OfflineBanner';

function CreoNumeral() {
  return (
    <Svg width={24} height={24} viewBox="0 0 40 40">
      <Line
        x1="12"
        y1="5"
        x2="12"
        y2="35"
        stroke={theme.colors.primary}
        strokeWidth={5}
        strokeLinecap="round"
      />
      <Line
        x1="28"
        y1="5"
        x2="28"
        y2="35"
        stroke={theme.colors.amber}
        strokeWidth={5}
        strokeLinecap="round"
      />
      <Line
        x1="5"
        y1="14"
        x2="35"
        y2="14"
        stroke={theme.colors.red}
        strokeWidth={5}
        strokeLinecap="round"
      />
      <Line
        x1="5"
        y1="27"
        x2="35"
        y2="27"
        stroke={theme.colors.cyan}
        strokeWidth={5}
        strokeLinecap="round"
      />
    </Svg>
  );
}

interface Props {
  title: string;
  subtitle?: string;
  showBack?: boolean;
  showLogout?: boolean;
  rightSlot?: React.ReactNode;
}

export function AppHeader({
  title,
  subtitle,
  showBack = false,
  showLogout = false,
  rightSlot,
}: Props) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const clearSession = useAuthStore((s) => s.clearSession);
  const { openConfirm, showLoading, hideFeedback, showError } = useFeedbackStore();
  const tapCountRef = useRef(0);
  const lastTapRef = useRef(0);

  const handleLogout = () => {
    openConfirm({
      title: 'Cerrar sesión',
      message:
        '¿Desea salir de su cuenta? Las actas guardadas localmente permanecerán seguras en este celular.',
      confirmLabel: 'Salir',
      cancelLabel: 'Cancelar',
      destructive: true,
      onConfirm: async () => {
        showLoading('Cerrando sesión...', 'Desconectando canales seguros');
        try {
          await container.logoutUseCase.execute();
          clearSession();
          hideFeedback();
          router.replace('/(auth)/login');
        } catch (err) {
          hideFeedback();
          showError(
            'Error al salir',
            err instanceof Error ? err.message : 'Intente nuevamente'
          );
        }
      },
    });
  };

  // Disparador oculto (5 toques rápidos en el escudo) para probar Sentry en la defensa (RF-17)
  const handleDiagnosticTap = () => {
    const now = Date.now();
    if (now - lastTapRef.current > 1500) {
      tapCountRef.current = 0;
    }
    lastTapRef.current = now;
    tapCountRef.current += 1;

    if (tapCountRef.current >= 5) {
      tapCountRef.current = 0;
      openConfirm({
        title: 'Diagnóstico Sentry (RF-17)',
        message:
          'Esta acción provocará un fallo controlado para verificar el reporte técnico (modelo, versión Android y pantalla) en Sentry sin datos personales.',
        confirmLabel: 'Probar fallo',
        cancelLabel: 'Cancelar',
        destructive: true,
        onConfirm: () => {
          container.crashMonitor.triggerControlledCrashForDemo();
        },
      });
    }
  };

  return (
    <View>
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 14) + 8 }]}>
        <View style={styles.row}>
          {showBack ? (
            <Pressable
              onPress={() => {
                if (router.canGoBack()) router.back();
              }}
              style={styles.iconBtn}
              accessibilityLabel="Volver atrás"
            >
              <ArrowLeft size={22} color={theme.colors.white} />
            </Pressable>
          ) : (
            <Pressable
              onPress={handleDiagnosticTap}
              style={styles.brandIcon}
              accessibilityLabel="CREO, Lista 21"
            >
              <CreoNumeral />
            </Pressable>
          )}

          <View style={styles.titleWrap}>
            <View style={styles.brandWordmark}>
              <Text style={styles.brandTag}>CREO</Text>
              <View style={styles.brandDivider} />
              <Text style={styles.brandTag}>21</Text>
            </View>
            <Text style={styles.title} numberOfLines={1}>
              {title}
            </Text>
            {subtitle ? (
              <Text style={styles.subtitle} numberOfLines={1}>
                {subtitle}
              </Text>
            ) : null}
          </View>

          {rightSlot}

          {showLogout ? (
            <Pressable
              onPress={handleLogout}
              style={styles.iconBtn}
              accessibilityLabel="Cerrar sesión"
            >
              <LogOut size={20} color={theme.colors.white} />
            </Pressable>
          ) : null}
        </View>
      </View>
      <View style={styles.accentBar}>
        <View style={[styles.accentSegment, { backgroundColor: theme.colors.primary }]} />
        <View style={[styles.accentSegment, { backgroundColor: theme.colors.cyan }]} />
        <View style={[styles.accentSegment, { backgroundColor: theme.colors.amber }]} />
        <View style={[styles.accentSegment, { backgroundColor: theme.colors.red }]} />
      </View>
      <OfflineBanner />
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: theme.spacing.md,
    paddingBottom: 14,
  },
  accentBar: { height: 4, flexDirection: 'row' },
  accentSegment: { flex: 1 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconBtn: {
    width: 52,
    height: 52,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.14)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  brandIcon: {
    width: 52,
    height: 52,
    borderRadius: 12,
    backgroundColor: theme.colors.white,
    borderWidth: 1,
    borderColor: theme.colors.white,
    justifyContent: 'center',
    alignItems: 'center',
  },
  titleWrap: {
    flex: 1,
  },
  brandWordmark: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
  },
  brandDivider: {
    width: 2,
    height: 12,
    backgroundColor: theme.colors.cyan,
  },
  brandTag: {
    color: theme.colors.cyan,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  title: {
    color: theme.colors.white,
    fontSize: 19,
    fontWeight: '800',
  },
  subtitle: {
    color: 'rgba(255,255,255,0.82)',
    fontSize: 13,
    marginTop: 1,
  },
});