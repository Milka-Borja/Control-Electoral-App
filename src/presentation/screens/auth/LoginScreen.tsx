import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'expo-router';
import { Lock, ShieldCheck } from 'lucide-react-native';
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
import { LoginInput, loginSchema } from '../../../domain/validators/userSchema';
import { container } from '../../../infrastructure/di/container';
import { ControlledInput } from '../../components/ControlledInput';
import { useAuthStore } from '../../store/authStore';
import { useFeedbackStore } from '../../store/feedbackStore';
import { theme } from '../../theme/theme';

export function LoginScreen() {
  const router = useRouter();
  const setUser = useAuthStore((s) => s.setUser);
  const { showLoading, hideFeedback, showError } = useFeedbackStore();

  const {
    control,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = async (values: LoginInput) => {
    showLoading('Verificando acceso...', 'Validando credenciales autorizadas');
    try {
      const user = await container.loginUseCase.execute(values.email, values.password);
      setUser(user);
      hideFeedback();
    } catch (err) {
      hideFeedback();
      showError(
        'Acceso denegado',
        err instanceof Error ? err.message : 'Verifique su correo y contraseña'
      );
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.hero}>
          <View style={styles.badge}>
            <ShieldCheck size={34} color={theme.colors.accent} />
          </View>
          <Text style={styles.brand}>{theme.brand.name}</Text>
          <Text style={styles.subBrand}>Control Electoral · {theme.brand.jurisdiction}</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Ingreso autorizado</Text>
          <Text style={styles.cardDesc}>
            El acceso es exclusivo para personal habilitado por la organización. No existe registro público.
          </Text>

          <ControlledInput
            control={control}
            name="email"
            label="Correo electrónico"
            placeholder="usuario@organizacion.ec"
            autoCapitalize="none"
            keyboardType="email-address"
          />

          <ControlledInput
            control={control}
            name="password"
            label="Contraseña"
            placeholder="Ingrese su contraseña"
            secureTextEntry
          />

          <Pressable
            onPress={handleSubmit(onSubmit)}
            disabled={isSubmitting}
            style={({ pressed }) => [
              styles.submitBtn,
              (pressed || isSubmitting) && { opacity: 0.85 },
            ]}
          >
            <Lock size={20} color={theme.colors.white} />
            <Text style={styles.submitText}>
              {isSubmitting ? 'Ingresando...' : 'Iniciar sesión'}
            </Text>
          </Pressable>

          <Pressable
            onPress={() => router.push('/(auth)/recuperar-clave')}
            style={styles.linkBtn}
          >
            <Text style={styles.linkText}>¿Olvidó su contraseña? Recupérela aquí</Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: theme.colors.primary,
  },
  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: theme.spacing.lg,
  },
  hero: {
    alignItems: 'center',
    marginBottom: 24,
  },
  badge: {
    width: 72,
    height: 72,
    borderRadius: 22,
    backgroundColor: 'rgba(233,168,37,0.16)',
    borderWidth: 2,
    borderColor: theme.colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  brand: {
    color: theme.colors.white,
    fontSize: 23,
    fontWeight: '800',
    textAlign: 'center',
  },
  subBrand: {
    color: theme.colors.accent,
    fontSize: 14,
    fontWeight: '700',
    marginTop: 4,
  },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.lg,
    elevation: 6,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: theme.colors.text,
  },
  cardDesc: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginTop: 4,
    marginBottom: 18,
    lineHeight: 20,
  },
  submitBtn: {
    minHeight: theme.touch.minButtonHeight,
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radius.md,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
    marginTop: 6,
  },
  submitText: {
    color: theme.colors.white,
    fontSize: 17,
    fontWeight: '700',
  },
  linkBtn: {
    marginTop: 16,
    paddingVertical: 10,
    alignItems: 'center',
  },
  linkText: {
    color: theme.colors.primaryLight,
    fontSize: 15,
    fontWeight: '700',
  },
});