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
import { QUERY_KEYS, usePanelRecintoQuery } from '../../hooks/useElectoralQueries';
import { useFeedbackStore } from '../../store/feedbackStore';
import { theme } from '../../theme/theme';

export function RecintoVeedoresScreen() {
  const queryClient = useQueryClient();
  const { data } = usePanelRecintoQuery();
  const { showLoading, hideFeedback, showSuccess, showError } = useFeedbackStore();

  const veedores = data?.veedores ?? [];

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
      rol: 'VEEDOR',
      esExterno: false,
    },
  });

  const onSubmit = async (values: CreateUserInput) => {
    showLoading('Creando cuenta de veedor...', 'Validando cédula y enviando correo SMTP');
    try {
      const res = await container.createManagedUserUseCase.execute({
        ...values,
        rol: 'VEEDOR',
      });
      await queryClient.invalidateQueries({ queryKey: QUERY_KEYS.panelRecinto });
      reset();
      hideFeedback();
      showSuccess(
        'Veedor registrado',
        `Se envió el enlace de verificación a ${res.email}.\nContraseña temporal: ${res.tempPassword}\nAl ingresar por primera vez deberá cambiarla.`
      );
    } catch (err) {
      hideFeedback();
      showError(
        'No se pudo crear el veedor',
        err instanceof Error ? err.message : 'Verifique los datos ingresados'
      );
    }
  };

  return (
    <View style={styles.root}>
      <AppHeader
        title="Gestión de Veedores"
        subtitle="Creación jerárquica autorizada (RF-01, RF-02)"
        showBack
      />
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Nuevo Veedor Electoral</Text>
          <ControlledInput
            control={control}
            name="cedula"
            label="Cédula ecuatoriana (10 dígitos)"
            placeholder="1730034061"
            keyboardType="number-pad"
            maxLength={10}
          />
          <ControlledInput
            control={control}
            name="nombres"
            label="Nombres completos"
            placeholder="Ej. María Fernanda"
          />
          <ControlledInput
            control={control}
            name="apellidos"
            label="Apellidos completos"
            placeholder="Ej. Gómez Paredes"
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
            placeholder="veedor@correo.ec"
            autoCapitalize="none"
            keyboardType="email-address"
          />

          <Pressable
            onPress={handleSubmit(onSubmit)}
            disabled={isSubmitting}
            style={styles.btn}
          >
            <UserPlus size={20} color={theme.colors.white} />
            <Text style={styles.btnText}>Registrar y enviar correo</Text>
          </Pressable>
        </View>

        <Text style={styles.listHeader}>
          Veedores habilitados ({veedores.length})
        </Text>
        {veedores.map((v) => (
          <View key={v.id} style={styles.userCard}>
            <Text style={styles.userName}>
              {v.nombres} {v.apellidos} {v.esExterno ? '(Sustituto externo)' : ''}
            </Text>
            <Text style={styles.userMeta}>
              CI: {v.cedula} · Tel: {v.telefono}
            </Text>
            <Text style={styles.userEmail}>{v.email}</Text>
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
    borderLeftColor: theme.colors.secondary,
  },
  userName: { fontSize: 16, fontWeight: '700', color: theme.colors.text },
  userMeta: { fontSize: 13, color: theme.colors.textSecondary, marginTop: 2 },
  userEmail: { fontSize: 13, color: theme.colors.primary, marginTop: 2 },
});