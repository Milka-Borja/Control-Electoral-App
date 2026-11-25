import { zodResolver } from '@hookform/resolvers/zod';
import * as Linking from 'expo-linking';
import { useRouter } from 'expo-router';
import { ShieldCheck } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  ChangePasswordInput,
  changePasswordSchema,
} from '../../../domain/validators/userSchema';
import { container } from '../../../infrastructure/di/container';
import { ControlledInput } from '../../components/ControlledInput';
import { useAuthStore } from '../../store/authStore';
import { useFeedbackStore } from '../../store/feedbackStore';
import { theme } from '../../theme/theme';

export function NuevaClaveScreen() {
  const router = useRouter();
  const { setUser, setRecoveryFlow } = useAuthStore();
  const { showLoading, hideFeedback, showSuccess, showError } = useFeedbackStore();
  const isRecoveryFlow = useAuthStore((s) => s.isRecoveryFlow);
  const [isRecoverySessionReady, setIsRecoverySessionReady] = useState(false);

  useEffect(() => {
    let mounted = true;

    const processRecoveryUrl = async (url: string | null) => {
      const linkType = url
        ? await container.authRepository.handleDeepLinkUrl(url)
        : 'NONE';
      if (linkType === 'RECOVERY') {
        setRecoveryFlow(true);
      }

      const recoveryActive = linkType === 'RECOVERY' || isRecoveryFlow;
      const currentUser = recoveryActive
        ? await container.authRepository.getCurrentSessionUser()
        : null;
      if (mounted) {
        setIsRecoverySessionReady(Boolean(currentUser));
      }
    };

    const handleError = (err: unknown) => {
      if (!mounted) return;
      setIsRecoverySessionReady(false);
      showError(
        'Enlace inválido o expirado',
        err instanceof Error ? err.message : 'Solicite un nuevo enlace de recuperación'
      );
    };

    const initialize = async () => {
      await processRecoveryUrl(await Linking.getInitialURL());
    };
    void initialize().catch(handleError);

    const linkSub = Linking.addEventListener('url', ({ url }) => {
      void processRecoveryUrl(url).catch(handleError);
    });

    return () => {
      mounted = false;
      linkSub.remove();
    };
  }, [isRecoveryFlow, setRecoveryFlow, showError]);

  const {
    control,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm<ChangePasswordInput>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: { password: '', confirmPassword: '' },
  });

  const onSubmit = async (values: ChangePasswordInput) => {
    if (!isRecoverySessionReady) {
      showError(
        'Sesión de recuperación no disponible',
        'Abra un enlace válido de recuperación antes de establecer una nueva contraseña.'
      );
      return;
    }

    showLoading('Restableciendo contraseña...', 'Aplicando cambios seguros');
    try {
      await container.changePasswordUseCase.execute(
        values.password,
        values.confirmPassword,
        true
      );
      const refreshed = await container.authRepository.getCurrentSessionUser();
      setRecoveryFlow(false);
      setUser(refreshed);
      hideFeedback();
      showSuccess(
        'Contraseña restablecida',
        'Su nueva contraseña está activa. Ya puede ingresar al sistema.',
        () => {
          if (!refreshed) router.replace('/(auth)/login');
        }
      );
    } catch (err) {
      hideFeedback();
      showError(
        'Enlace inválido o expirado',
        err instanceof Error ? err.message : 'Solicite un nuevo enlace de recuperación'
      );
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={0}
    >
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets={true}
      >
        <View style={styles.card}>
          <ShieldCheck size={38} color={theme.colors.secondary} />
          <Text style={styles.title}>Establecer nueva contraseña</Text>
          <Text style={styles.desc}>
            Ingrese su nueva contraseña definitiva para recuperar el acceso a su cuenta.
          </Text>
          {!isRecoverySessionReady ? (
            <Text style={styles.sessionHint}>
              Abra desde este dispositivo el enlace de recuperación enviado a su correo.
            </Text>
          ) : null}

          <ControlledInput
            control={control}
            name="password"
            label="Nueva contraseña"
            placeholder="Mínimo 8 caracteres, mayúscula y número"
            secureTextEntry
          />

          <ControlledInput
            control={control}
            name="confirmPassword"
            label="Confirmar contraseña"
            placeholder="Repita la contraseña"
            secureTextEntry
          />

          <Pressable
            onPress={handleSubmit(onSubmit)}
            disabled={isSubmitting || !isRecoverySessionReady}
            style={[
              styles.btn,
              (isSubmitting || !isRecoverySessionReady) && styles.btnDisabled,
            ]}
          >
            <Text style={styles.btnText}>
              {isRecoverySessionReady
                ? 'Confirmar nueva contraseña'
                : 'Esperando sesión de recuperación'}
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scrollView: { flex: 1 },
  scroll: {
    flexGrow: 1,
    backgroundColor: theme.colors.background,
    justifyContent: 'center',
    padding: theme.spacing.lg,
    paddingBottom: 120,
  },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.lg,
    gap: 8,
    elevation: 4,
  },
  title: { fontSize: 21, fontWeight: '800', color: theme.colors.text, marginTop: 6 },
  desc: { fontSize: 15, color: theme.colors.textSecondary, lineHeight: 22, marginBottom: 12 },
  sessionHint: {
    color: theme.colors.danger,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 8,
  },
  btn: {
    minHeight: theme.touch.minButtonHeight,
    backgroundColor: theme.colors.secondary,
    borderRadius: theme.radius.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 6,
  },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: theme.colors.white, fontSize: 16, fontWeight: '700' },
});