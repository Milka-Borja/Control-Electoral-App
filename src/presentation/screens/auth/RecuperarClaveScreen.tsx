import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'expo-router';
import { MailCheck } from 'lucide-react-native';
import React from 'react';
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
import { RecoveryInput, recoverySchema } from '../../../domain/validators/userSchema';
import { container } from '../../../infrastructure/di/container';
import { AppHeader } from '../../components/AppHeader';
import { ControlledInput } from '../../components/ControlledInput';
import { useFeedbackStore } from '../../store/feedbackStore';
import { theme } from '../../theme/theme';

export function RecuperarClaveScreen() {
  const router = useRouter();
  const { showLoading, hideFeedback, showSuccess, showError } = useFeedbackStore();

  const {
    control,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm<RecoveryInput>({
    resolver: zodResolver(recoverySchema),
    defaultValues: { email: '' },
  });

  const onSubmit = async (values: RecoveryInput) => {
    showLoading('Enviando enlace...', 'Verificando que su correo esté confirmado');
    try {
      await container.requestPasswordRecoveryUseCase.execute(values.email);
      hideFeedback();
      showSuccess(
        'Enlace enviado',
        'Revise su bandeja de entrada (o spam) y toque el enlace de un solo uso para establecer su nueva contraseña.',
        () => router.replace('/(auth)/login')
      );
    } catch (err) {
      hideFeedback();
      showError(
        'No se pudo enviar el enlace',
        err instanceof Error ? err.message : 'Intente nuevamente'
      );
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={0}
    >
      <AppHeader title="Recuperar acceso" subtitle="Solo correos verificados" showBack />
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets={true}
      >
        <View style={styles.card}>
          <MailCheck size={36} color={theme.colors.primary} />
          <Text style={styles.title}>Restablecer contraseña</Text>
          <Text style={styles.desc}>
            Ingrese su correo electrónico verificado. Le enviaremos un enlace único con tiempo de expiración.
          </Text>

          <ControlledInput
            control={control}
            name="email"
            label="Correo verificado"
            placeholder="usuario@organizacion.ec"
            autoCapitalize="none"
            keyboardType="email-address"
          />

          <Pressable
            onPress={handleSubmit(onSubmit)}
            disabled={isSubmitting}
            style={styles.btn}
          >
            <Text style={styles.btnText}>Enviar enlace de recuperación</Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.colors.background },
  content: { padding: theme.spacing.lg, paddingBottom: 120 },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.lg,
    gap: 8,
    elevation: 3,
  },
  title: { fontSize: 20, fontWeight: '800', color: theme.colors.text, marginTop: 6 },
  desc: { fontSize: 15, color: theme.colors.textSecondary, lineHeight: 22, marginBottom: 10 },
  btn: {
    minHeight: theme.touch.minButtonHeight,
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radius.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 6,
  },
  btnText: { color: theme.colors.white, fontSize: 16, fontWeight: '700' },
});