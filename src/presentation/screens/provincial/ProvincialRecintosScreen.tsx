import { zodResolver } from '@hookform/resolvers/zod';
import { useQueryClient } from '@tanstack/react-query';
import { PlusCircle, UserCheck, X } from 'lucide-react-native';
import React, { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Recinto } from '../../../domain/entities';
import {
  CreateRecintoInput,
  createRecintoSchema,
} from '../../../domain/validators/userSchema';
import { container } from '../../../infrastructure/di/container';
import { AppHeader } from '../../components/AppHeader';
import { ControlledInput } from '../../components/ControlledInput';
import {
  QUERY_KEYS,
  useCoordinadoresQuery,
  useRecintosQuery,
} from '../../hooks/useElectoralQueries';
import { useFeedbackStore } from '../../store/feedbackStore';
import { theme } from '../../theme/theme';

export function ProvincialRecintosScreen() {
  const queryClient = useQueryClient();
  const { data: recintos = [] } = useRecintosQuery();
  const { data: coordinadores = [] } = useCoordinadoresQuery();
  const { showLoading, hideFeedback, showSuccess, showError } = useFeedbackStore();

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [assigningRecinto, setAssigningRecinto] = useState<Recinto | null>(null);

  const {
    control,
    handleSubmit,
    reset,
    formState: { isSubmitting },
  } = useForm<CreateRecintoInput>({
    resolver: zodResolver(createRecintoSchema),
    defaultValues: {
      parroquia: '',
      nombre: '',
      latitud: -0.2105,
      longitud: -78.4893,
      cantidadMesas: 4,
    },
  });

  const onCreateRecinto = async (values: CreateRecintoInput) => {
    showLoading('Registrando recinto...', 'Creando recinto y mesas electorales');
    try {
      await container.createRecintoUseCase.execute(values);
      await queryClient.invalidateQueries({ queryKey: QUERY_KEYS.recintos });
      reset();
      setShowCreateForm(false);
      hideFeedback();
      showSuccess(
        'Recinto registrado',
        `Se creó "${values.nombre}" con ${values.cantidadMesas} mesas en Pichincha – Quito.`
      );
    } catch (err) {
      hideFeedback();
      showError(
        'No se pudo crear el recinto',
        err instanceof Error ? err.message : 'Verifique los datos'
      );
    }
  };

  const handleAssignCoord = async (coordinadorId: string, coordNombre: string) => {
    if (!assigningRecinto) return;
    const recinto = assigningRecinto;
    setAssigningRecinto(null);

    showLoading('Asignando coordinador...', 'Validando exclusividad por recinto (RF-07)');
    try {
      await container.asignarCoordinadorRecintoUseCase.execute(
        recinto.id,
        coordinadorId
      );
      await queryClient.invalidateQueries({ queryKey: QUERY_KEYS.recintos });
      hideFeedback();
      showSuccess(
        'Coordinador asignado',
        `${coordNombre} quedó como único responsable de ${recinto.nombre}.`
      );
    } catch (err) {
      hideFeedback();
      showError(
        'Asignación rechazada',
        err instanceof Error ? err.message : 'No se pudo asignar el coordinador'
      );
    }
  };

  // Filtrar coordinadores que aún no tienen otro recinto asignado (RF-07)
  const recintosPorCoord = new Map(
    recintos
      .filter((r) => r.coordinadorId)
      .map((r) => [r.coordinadorId!, r.nombre])
  );

  return (
    <View style={styles.root}>
      <AppHeader
        title="Recintos Electorales"
        subtitle="Pichincha · Quito (RF-06, RF-07)"
        showBack
      />

      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Pressable
          onPress={() => setShowCreateForm((v) => !v)}
          style={styles.toggleCreateBtn}
        >
          <PlusCircle size={20} color={theme.colors.white} />
          <Text style={styles.toggleCreateText}>
            {showCreateForm ? 'Cerrar formulario' : 'Registrar nuevo recinto electoral'}
          </Text>
        </Pressable>

        {showCreateForm ? (
          <View style={styles.formCard}>
            <Text style={styles.formTitle}>Nuevo Recinto en Quito</Text>
            <ControlledInput
              control={control}
              name="parroquia"
              label="Parroquia"
              placeholder="Ej. La Floresta"
            />
            <ControlledInput
              control={control}
              name="nombre"
              label="Nombre del recinto electoral"
              placeholder="Ej. Unidad Educativa Simón Bolívar"
            />
            <View style={styles.twoCols}>
              <View style={{ flex: 1 }}>
                <Controller
                  control={control}
                  name="latitud"
                  render={({ field: { onChange, value }, fieldState: { error } }) => (
                    <View style={{ marginBottom: 12 }}>
                      <Text style={styles.coordLabel}>Latitud GPS</Text>
                      <TextInput
                        defaultValue={String(value)}
                        onChangeText={(txt) => onChange(parseFloat(txt) || 0)}
                        keyboardType="numbers-and-punctuation"
                        style={styles.coordInput}
                      />
                      {error?.message ? (
                        <Text style={styles.errText}>{error.message}</Text>
                      ) : null}
                    </View>
                  )}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Controller
                  control={control}
                  name="longitud"
                  render={({ field: { onChange, value }, fieldState: { error } }) => (
                    <View style={{ marginBottom: 12 }}>
                      <Text style={styles.coordLabel}>Longitud GPS</Text>
                      <TextInput
                        defaultValue={String(value)}
                        onChangeText={(txt) => onChange(parseFloat(txt) || 0)}
                        keyboardType="numbers-and-punctuation"
                        style={styles.coordInput}
                      />
                      {error?.message ? (
                        <Text style={styles.errText}>{error.message}</Text>
                      ) : null}
                    </View>
                  )}
                />
              </View>
            </View>
            <ControlledInput
              control={control}
              name="cantidadMesas"
              label="Cantidad de mesas (JRV)"
              numeric
              placeholder="4"
            />
            <Pressable
              onPress={handleSubmit(onCreateRecinto)}
              disabled={isSubmitting}
              style={styles.saveRecintoBtn}
            >
              <Text style={styles.saveRecintoText}>Guardar recinto</Text>
            </Pressable>
          </View>
        ) : null}

        {recintos.map((r) => (
          <View key={r.id} style={styles.card}>
            <Text style={styles.parroquiaTag}>PARROQUIA {r.parroquia.toUpperCase()}</Text>
            <Text style={styles.recintoName}>{r.nombre}</Text>
            <Text style={styles.coords}>
              GPS: {r.latitud.toFixed(5)}, {r.longitud.toFixed(5)} · {r.totalMesas ?? 0} mesas
            </Text>
            <Text style={styles.coordLine}>
              Responsable:{' '}
              <Text style={styles.coordBold}>
                {r.coordinadorNombre ?? 'Sin coordinador asignado'}
              </Text>
            </Text>

            <Pressable
              onPress={() => setAssigningRecinto(r)}
              style={styles.assignBtn}
            >
              <UserCheck size={17} color={theme.colors.primary} />
              <Text style={styles.assignText}>
                {r.coordinadorId
                  ? 'Cambiar coordinador único'
                  : 'Asignar coordinador responsable'}
              </Text>
            </Pressable>
          </View>
        ))}
      </ScrollView>

      {/* Selector de coordinador único por recinto (RF-07) */}
      <Modal visible={Boolean(assigningRecinto)} transparent animationType="slide">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                Asignar responsable · {assigningRecinto?.nombre}
              </Text>
              <Pressable onPress={() => setAssigningRecinto(null)}>
                <X size={22} color={theme.colors.text} />
              </Pressable>
            </View>

            <ScrollView style={{ maxHeight: 380 }}>
              {coordinadores.length === 0 ? (
                <Text style={styles.emptyText}>
                  No existen coordinadores de recinto creados. Créelos primero en la pantalla "Coord. Recinto".
                </Text>
              ) : (
                coordinadores.map((c) => {
                  const otroRecinto = recintosPorCoord.get(c.id);
                  const ocupadoEnOtro =
                    Boolean(otroRecinto) && c.id !== assigningRecinto?.coordinadorId;
                  return (
                    <Pressable
                      key={c.id}
                      disabled={ocupadoEnOtro}
                      onPress={() =>
                        handleAssignCoord(c.id, `${c.nombres} ${c.apellidos}`)
                      }
                      style={[styles.coordOpt, ocupadoEnOtro && { opacity: 0.45 }]}
                    >
                      <View style={{ flex: 1 }}>
                        <Text style={styles.optName}>
                          {c.nombres} {c.apellidos}
                        </Text>
                        <Text style={styles.optMeta}>
                          CI: {c.cedula}
                          {ocupadoEnOtro ? ` · Ya asignado a: ${otroRecinto}` : ''}
                        </Text>
                      </View>
                      {!ocupadoEnOtro ? (
                        <Text style={styles.optChoose}>Asignar</Text>
                      ) : null}
                    </Pressable>
                  );
                })
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.colors.background },
  scroll: { paddingHorizontal: 16, paddingTop: 14, gap: 12, paddingBottom: 32 },
  toggleCreateBtn: {
    minHeight: theme.touch.minButtonHeight,
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radius.md,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  toggleCreateText: { color: theme.colors.white, fontSize: 16, fontWeight: '700' },
  formCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  formTitle: { fontSize: 17, fontWeight: '800', color: theme.colors.primary, marginBottom: 12 },
  twoCols: { flexDirection: 'row', gap: 10 },
  coordLabel: { fontSize: 14, fontWeight: '600', color: theme.colors.text, marginBottom: 6 },
  coordInput: {
    minHeight: 50,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    fontSize: 15,
    backgroundColor: theme.colors.surface,
  },
  errText: { fontSize: 12, color: theme.colors.danger, marginTop: 4 },
  saveRecintoBtn: {
    minHeight: theme.touch.minButtonHeight,
    backgroundColor: theme.colors.secondary,
    borderRadius: theme.radius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveRecintoText: { color: theme.colors.white, fontSize: 16, fontWeight: '700' },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    padding: 15,
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: 4,
  },
  parroquiaTag: { fontSize: 11, fontWeight: '800', color: theme.colors.secondary },
  recintoName: { fontSize: 17, fontWeight: '800', color: theme.colors.text },
  coords: { fontSize: 12, color: theme.colors.textSecondary },
  coordLine: { fontSize: 14, color: theme.colors.textSecondary, marginTop: 4 },
  coordBold: { fontWeight: '700', color: theme.colors.primary },
  assignBtn: {
    marginTop: 8,
    minHeight: 46,
    borderRadius: 12,
    backgroundColor: theme.colors.accentSoft,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  assignText: { fontSize: 14, fontWeight: '800', color: theme.colors.primary },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.58)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 18,
    paddingBottom: 28,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalTitle: { flex: 1, fontSize: 17, fontWeight: '800', color: theme.colors.text },
  emptyText: { fontSize: 14, color: theme.colors.textSecondary, textAlign: 'center', padding: 20 },
  coordOpt: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    backgroundColor: theme.colors.background,
    marginBottom: 8,
  },
  optName: { fontSize: 15, fontWeight: '700', color: theme.colors.text },
  optMeta: { fontSize: 12, color: theme.colors.textSecondary, marginTop: 2 },
  optChoose: { fontSize: 14, fontWeight: '800', color: theme.colors.secondary },
});