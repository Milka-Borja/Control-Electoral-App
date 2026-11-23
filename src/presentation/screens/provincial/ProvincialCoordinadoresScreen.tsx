import { zodResolver } from '@hookform/resolvers/zod';
import { useQueryClient } from '@tanstack/react-query';
import { UserPlus } from 'lucide-react-native';
import React from 'react';
import { useForm } from 'react-hook-form';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { z } from 'zod';
import { CreateUserInput, createUserSchema } from '../../../domain/validators/userSchema';
import { container } from '../../../infrastructure/di/container';
import { AppHeader } from '../../components/AppHeader';
import { ControlledInput } from '../../components/ControlledInput';
import { QUERY_KEYS, useCoordinadoresQuery } from '../../hooks/useElectoralQueries';
import { useFeedbackStore } from '../../store/feedbackStore';
import { theme } from '../../theme/theme';

export function ProvincialCoordinadoresScreen() {
  const queryClient = useQueryClient();
  const { data: coordinadores = [] } = useCoordinadoresQuery();
  const { showLoading, hideFeedback, showSuccess, showError } = useFeedbackStore();

  const {
    control,
    handleSubmit,
    reset,
    formState: { isSubmitting },
  } = useForm<z.input<typeof createUserSchema>, unknown, CreateUserInput>({
    resolver: zodResolver(createUserSchema),
    defaultValues: {
      cedula: '',
      nombres: '',
      apellidos: '',
      telefono: '',
      email: '',
      rol: 'RECINTO',
      esExterno: false,
    },
  });

  const onSubmit = async (values: CreateUserInput) => {
    showLoading(
      'Creando Coordinador de Recinto...',
      'Validando cédula ecuatoriana y enviando enlace SMTP'
    );
    try {
      const res = await container.createManagedUserUseCase.execute({
        ...values,
        rol: 'RECINTO',
      });
      await queryClient.invalidateQueries({ queryKey: QUERY_KEYS.coordinadores });
      reset();
      hideFeedback();
      showSuccess(
        'Coordinador creado',
        `Se envió el enlace de confirmación a ${res.email}.\nContraseña temporal: ${res.tempPassword}\nAl ingresar por primera vez deberá establecer su clave definitiva.`
      );
    } catch (err) {
      hideFeedback();
      showError(
        'No se pudo crear la cuenta',
        err instanceof Error ? err.message : 'Verifique los datos ingresados'
      );
    }
  };

  return (
    <View style={styles.root}>
      <AppHeader
        title="Coordinadores de Recinto"
        subtitle="Creación jerárquica por Provincial (RF-01, RF-02)"
        showBack
      />
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Registrar Coordinador de Recinto</Text>
          <ControlledInput
            control={control}
            name="cedula"
            label="Cédula ecuatoriana (10 dígitos)"
            placeholder="1720034063"
            keyboardType="number-pad"
            maxLength={10}
          />
          <ControlledInput
            control={control}
            name="nombres"
            label="Nombres completos"
            placeholder="Ej. Luis Alberto"
          />
          <ControlledInput
            control={control}
            name="apellidos"
            label="Apellidos completos"
            placeholder="Ej. Zambrano Ortiz"
          />
          <ControlledInput
            control={control}
            name="telefono"
            label="Teléfono celular"
            placeholder="0991234567"
            keyboardType="phone-pad"
            maxLength={10}
          />
          <ControlledInput
            control={control}
            name="email"
            label="Correo electrónico"
            placeholder="coordinador@correo.ec"
            autoCapitalize="none"
            keyboardType="email-address"
          />

          <Pressable
            onPress={handleSubmit(onSubmit)}
            disabled={isSubmitting}
            style={styles.btn}
          >
            <UserPlus size={20} color={theme.colors.white} />
            <Text style={styles.btnText}>Crear cuenta y enviar confirmación</Text>
          </Pressable>
        </View>

        <Text style={styles.listHeader}>
          Coordinadores registrados ({coordinadores.length})
        </Text>
        {coordinadores.map((c) => (
          <View key={c.id} style={styles.userCard}>
            <Text style={styles.userName}>
              {c.nombres} {c.apellidos}
            </Text>
            <Text style={styles.userMeta}>
              CI: {c.cedula} · Tel: {c.telefono}
            </Text>
            <Text style={styles.userEmail}>{c.email}</Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.colors.background },
  scroll: { padding: theme.spacing.md, gap: 12, paddingBottom: 32 },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: theme.colors.primary,
    marginBottom: 12,
  },
  btn: {
    minHeight: theme.touch.minButtonHeight,
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radius.md,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
    marginTop: 6,
  },
  btnText: { color: theme.colors.white, fontSize: 16, fontWeight: '700' },
  listHeader: { fontSize: 16, fontWeight: '800', color: theme.colors.text, marginTop: 6 },
  userCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    padding: 14,
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.primary,
  },
  userName: { fontSize: 16, fontWeight: '700', color: theme.colors.text },
  userMeta: { fontSize: 13, color: theme.colors.textSecondary, marginTop: 2 },
  userEmail: { fontSize: 13, color: theme.colors.primary, marginTop: 2 },
});