import { useRouter } from 'expo-router';
import { ArrowLeft, LogOut, ShieldCheck } from 'lucide-react-native';
import React, { useRef } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { container } from '../../infrastructure/di/container';
import { useAuthStore } from '../store/authStore';
import { useFeedbackStore } from '../store/feedbackStore';
import { theme } from '../theme/theme';
import { OfflineBanner } from './OfflineBanner';

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
              onPress={() => router.back()}
              style={styles.iconBtn}
              accessibilityLabel="Volver atrás"
            >
              <ArrowLeft size={22} color={theme.colors.white} />
            </Pressable>
          ) : (
            <Pressable onPress={handleDiagnosticTap} style={styles.brandIcon}>
              <ShieldCheck size={22} color={theme.colors.accent} />
            </Pressable>
          )}

          <View style={styles.titleWrap}>
            <Text style={styles.brandTag}>{theme.brand.shortName}</Text>
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
      <OfflineBanner />
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: theme.spacing.md,
    paddingBottom: 14,
    borderBottomWidth: 3,
    borderBottomColor: theme.colors.accent,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.14)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  brandIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(233,168,37,0.16)',
    borderWidth: 1,
    borderColor: 'rgba(233,168,37,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  titleWrap: {
    flex: 1,
  },
  brandTag: {
    color: theme.colors.accent,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
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