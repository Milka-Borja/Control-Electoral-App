import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'expo-router';
import { Lock } from 'lucide-react-native';
import LottieView from 'lottie-react-native';
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
import Svg, { Path } from 'react-native-svg';
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
      <View pointerEvents="none" style={styles.backdrop}>
        <Svg
          width="100%"
          height="100%"
          viewBox="0 0 400 800"
          preserveAspectRatio="xMidYMid slice"
        >
          <Path
            d="M-90 180 170-80M-90 230 220-80M-90 280 270-80M-90 330 320-80"
            stroke={theme.colors.stripeTint}
            strokeWidth={18}
            opacity={0.55}
          />
          <Path
            d="M-30 65C25 12 70 18 115 45"
            stroke={theme.colors.cyan}
            strokeWidth={13}
            strokeLinecap="round"
            opacity={0.5}
          />
          <Path
            d="M-28 91C28 38 73 44 118 71"
            stroke={theme.colors.primary}
            strokeWidth={8}
            strokeLinecap="round"
            opacity={0.35}
          />
          <Path
            d="M-15 760 55 690M15 790 85 720M-10 705 65 780M25 675 100 750"
            stroke={theme.colors.primary}
            strokeWidth={7}
            strokeLinecap="round"
            opacity={0.18}
          />
          <Path
            d="M305 820C330 760 360 748 430 755"
            stroke={theme.colors.red}
            strokeWidth={14}
            strokeLinecap="round"
            opacity={0.35}
          />
          <Path
            d="M315 842C340 782 370 770 440 777"
            stroke={theme.colors.amber}
            strokeWidth={9}
            strokeLinecap="round"
            opacity={0.45}
          />
        </Svg>
      </View>
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.hero}>
          <View style={styles.logoCard}>
            <View style={styles.logoRow}>
              <LottieView
                source={require('../../../../assets/lottie/creo-logo.json')}
                autoPlay
                loop
                style={styles.logoAnimation}
              />
              <Text style={styles.brand}>CREO</Text>
              <View style={styles.logoDivider} />
              <Text style={styles.listNumber}>21</Text>
            </View>
            <View style={styles.sloganRow}>
              <Text style={styles.sloganRegular}>CREANDO</Text>
              <Text style={styles.sloganBold}>OPORTUNIDADES</Text>
            </View>
            <View style={styles.brandAccentBar}>
              <View style={[styles.accentSegment, { backgroundColor: theme.colors.primary }]} />
              <View style={[styles.accentSegment, { backgroundColor: theme.colors.cyan }]} />
              <View style={[styles.accentSegment, { backgroundColor: theme.colors.amber }]} />
              <View style={[styles.accentSegment, { backgroundColor: theme.colors.red }]} />
            </View>
          </View>
          <Text style={styles.brandTag}>LISTA 21 · PICHINCHA</Text>
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
    backgroundColor: theme.colors.background,
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
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
  logoCard: {
    width: '100%',
    maxWidth: 300,
    backgroundColor: theme.colors.surface,
    borderRadius: 18,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    marginBottom: 12,
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#0F172A',
    shadowOpacity: 0.12,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 5 },
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  logoAnimation: {
    width: 64,
    height: 64,
  },
  logoDivider: {
    width: 2,
    height: 31,
    backgroundColor: theme.colors.cyan,
    marginHorizontal: 2,
  },
  listNumber: {
    color: theme.colors.primary,
    fontSize: 30,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  sloganRow: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 7,
  },
  sloganRegular: {
    color: theme.colors.primary,
    fontSize: 12,
    fontWeight: '500',
    letterSpacing: 0.2,
  },
  sloganBold: {
    color: theme.colors.primary,
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.1,
  },
  brandAccentBar: {
    width: '100%',
    height: 4,
    flexDirection: 'row',
    marginTop: 12,
    borderRadius: 2,
    overflow: 'hidden',
  },
  brandTag: {
    color: theme.colors.primary,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 2,
  },
  brand: {
    color: theme.colors.primary,
    fontSize: 30,
    fontWeight: '900',
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  subBrand: {
    color: theme.colors.textSecondary,
    fontSize: 16,
    fontWeight: '700',
    marginTop: 4,
  },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    padding: theme.spacing.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: theme.colors.text,
  },
  cardDesc: {
    fontSize: 16,
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
    minHeight: 52,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  linkText: {
    color: theme.colors.primaryLight,
    fontSize: 16,
    fontWeight: '700',
  },
  accentSegment: { flex: 1 },
});