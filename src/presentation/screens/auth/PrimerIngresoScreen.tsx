import { zodResolver } from '@hookform/resolvers/zod';
import { KeyRound } from 'lucide-react-native';
import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import {
  BackHandler,
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

export function PrimerIngresoScreen() {
  const { user, markPasswordChanged } = useAuthStore();
  const { showLoading, hideFeedback, showSuccess, showError } = useFeedbackStore();

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => true);
    return () => sub.remove();
  }, []);

  const {
    control,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm<ChangePasswordInput>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: { password: '', confirmPassword: '' },
  });

  const onSubmit = async (values: ChangePasswordInput) => {
    showLoading('Guardando nueva clave...', 'Actualizando credenciales personales');
    try {
      await container.changePasswordUseCase.execute(
        values.password,
        values.confirmPassword,
        true
      );
      hideFeedback();
      showSuccess(
        'Contraseña definitiva guardada',
        'A partir de ahora solo usted conoce su contraseña de acceso.',
        () => markPasswordChanged()
      );
    } catch (err) {
      hideFeedback();
      showError(
        'No se pudo actualizar',
        err instanceof Error ? err.message : 'Intente nuevamente'
      );
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
      <View style={styles.card}>
        <View style={styles.iconWrap}>
          <KeyRound size={32} color={theme.colors.primary} />
        </View>
        <Text style={styles.title}>Cambio obligatorio de contraseña</Text>
        <Text style={styles.desc}>
          Hola {user?.nombres ?? ''}. Como su cuenta fue creada por un coordinador, debe elegir una contraseña personal antes de continuar.
        </Text>

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
          placeholder="Repita su nueva contraseña"
          secureTextEntry
        />

        <Pressable
          onPress={handleSubmit(onSubmit)}
          disabled={isSubmitting}
          style={styles.btn}
        >
          <Text style={styles.btnText}>Guardar contraseña definitiva</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flexGrow: 1,
    backgroundColor: theme.colors.background,
    justifyContent: 'center',
    padding: theme.spacing.lg,
  },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.lg,
    borderTopWidth: 5,
    borderTopColor: theme.colors.primary,
    elevation: 4,
  },
  iconWrap: {
    width: 60,
    height: 60,
    borderRadius: 16,
    backgroundColor: theme.colors.accentSoft,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
  },
  title: {
    fontSize: 21,
    fontWeight: '800',
    color: theme.colors.text,
  },
  desc: {
    fontSize: 15,
    color: theme.colors.textSecondary,
    lineHeight: 22,
    marginTop: 6,
    marginBottom: 20,
  },
  btn: {
    minHeight: theme.touch.minButtonHeight,
    backgroundColor: theme.colors.secondary,
    borderRadius: theme.radius.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  btnText: {
    color: theme.colors.white,
    fontSize: 16,
    fontWeight: '700',
  },
});