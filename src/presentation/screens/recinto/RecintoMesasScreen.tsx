import { zodResolver } from '@hookform/resolvers/zod';
import { useQueryClient } from '@tanstack/react-query';
import { RefreshCw, UserCheck, UserPlus, X } from 'lucide-react-native';
import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import {
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { z } from 'zod';
import { Mesa } from '../../../domain/entities';
import { CreateUserInput, createUserSchema } from '../../../domain/validators/userSchema';
import { container } from '../../../infrastructure/di/container';
import { AppHeader } from '../../components/AppHeader';
import { ControlledInput } from '../../components/ControlledInput';
import { QUERY_KEYS, usePanelRecintoQuery } from '../../hooks/useElectoralQueries';
import { useFeedbackStore } from '../../store/feedbackStore';
import { theme } from '../../theme/theme';

export function RecintoMesasScreen() {
  const queryClient = useQueryClient();
  const { data, refetch, isRefetching } = usePanelRecintoQuery();
  const { showLoading, hideFeedback, showSuccess, showError, openConfirm } =
    useFeedbackStore();

  const mesas = data?.mesas ?? [];
  const veedores = data?.veedores ?? [];

  const [selectedMesa, setSelectedMesa] = useState<Mesa | null>(null);
  const [mode, setMode] = useState<'EXISTENTE' | 'SUSTITUTO_EXTERNO'>('EXISTENTE');

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
      esExterno: true,
    },
  });

  const cerrarModal = () => {
    setSelectedMesa(null);
    setMode('EXISTENTE');
    reset();
  };

  const handleAsignarExistente = (veedorId: string, veedorNombre: string) => {
    if (!selectedMesa) return;
    const mesa = selectedMesa;
    cerrarModal();

    openConfirm({
      title: mesa.veedorActivoId ? 'Reemplazar veedor ausente' : 'Asignar veedor a mesa',
      message: mesa.veedorActivoId
        ? `Se revocará de inmediato el acceso de ${mesa.veedorActivoNombre} sobre la JRV N.° ${mesa.numeroJrv} y se asignará a ${veedorNombre}. Las actas ya subidas se conservarán intactas (S-05).`
        : `¿Asignar la JRV N.° ${mesa.numeroJrv} a ${veedorNombre}?`,
      confirmLabel: 'Confirmar asignación',
      onConfirm: async () => {
        showLoading('Actualizando asignación...', 'Aplicando control de acceso RLS');
        try {
          await container.reasignarMesaVeedorUseCase.execute(mesa.id, veedorId);
          await queryClient.invalidateQueries({ queryKey: QUERY_KEYS.panelRecinto });
          hideFeedback();
          showSuccess(
            'Mesa asignada',
            `JRV N.° ${mesa.numeroJrv} asignada a ${veedorNombre}. El acceso anterior fue revocado de inmediato.`
          );
        } catch (err) {
          hideFeedback();
          showError(
            'Error al asignar',
            err instanceof Error ? err.message : 'Intente nuevamente'
          );
        }
      },
    });
  };

  const onCreateSustituto = async (values: CreateUserInput) => {
    if (!selectedMesa) return;
    const mesa = selectedMesa;

    showLoading(
      'Creando veedor sustituto...',
      'Registrando cuenta externa y reasignando mesa al instante'
    );
    try {
      const result = await container.createManagedUserUseCase.execute({
        ...values,
        rol: 'VEEDOR',
        esExterno: true,
        mesaIds: [mesa.id],
      });

      await queryClient.invalidateQueries({ queryKey: QUERY_KEYS.panelRecinto });
      cerrarModal();
      hideFeedback();
      showSuccess(
        'Sustituto creado y asignado',
        `Se envió el enlace de confirmación a ${result.email}.\nClave temporal: ${result.tempPassword}\nLa JRV N.° ${mesa.numeroJrv} ya quedó bajo su control.`
      );
    } catch (err) {
      hideFeedback();
      showError(
        'No se pudo crear el sustituto',
        err instanceof Error ? err.message : 'Revise los datos ingresados'
      );
    }
  };

  const renderMesa = ({ item }: { item: Mesa }) => (
    <View style={styles.card}>
      <View style={styles.cardRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.jrvTitle}>
            JRV N.° {item.numeroJrv} ({item.genero === 'M' ? 'Hombres' : 'Mujeres'})
          </Text>
          <Text style={styles.veedorLine}>
            Veedor:{' '}
            <Text style={styles.veedorBold}>
              {item.veedorActivoNombre ?? 'Sin veedor asignado'}
            </Text>
          </Text>
        </View>
        <View style={styles.avanceBadge}>
          <Text style={styles.avanceText}>{item.avance ?? 'PENDIENTE'}</Text>
        </View>
      </View>

      <Pressable
        onPress={() => {
          setSelectedMesa(item);
          setMode('EXISTENTE');
        }}
        style={[
          styles.assignBtn,
          item.veedorActivoId ? styles.replaceBtn : styles.newAssignBtn,
        ]}
      >
        <RefreshCw size={17} color={theme.colors.white} />
        <Text style={styles.assignBtnText}>
          {item.veedorActivoId ? 'Reemplazar veedor ausente' : 'Asignar veedor'}
        </Text>
      </Pressable>
    </View>
  );

  return (
    <View style={styles.root}>
      <AppHeader
        title="Mesas y Asignaciones"
        subtitle="Un veedor puede cubrir múltiples mesas (RF-08)"
        showBack
      />

      <FlatList
        data={mesas}
        keyExtractor={(m) => m.id}
        renderItem={renderMesa}
        contentContainerStyle={styles.list}
        refreshing={isRefetching}
        onRefresh={refetch}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>
              {!data?.recinto
                ? 'Aún no tienes un recinto electoral asignado. Solicita al Coordinador Provincial que te asigne un recinto (RF-07)'
                : 'Este recinto aún no tiene mesas (JRV) registradas'}
            </Text>
          </View>
        }
      />

      {/* Modal de asignación o creación inmediata de sustituto externo (RF-20) */}
      <Modal visible={Boolean(selectedMesa)} animationType="slide" transparent>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                JRV N.° {selectedMesa?.numeroJrv} · Gestión de Veedor
              </Text>
              <Pressable onPress={cerrarModal} style={styles.closeBtn}>
                <X size={22} color={theme.colors.text} />
              </Pressable>
            </View>

            <View style={styles.tabRow}>
              <Pressable
                onPress={() => setMode('EXISTENTE')}
                style={[styles.tabBtn, mode === 'EXISTENTE' && styles.tabBtnActive]}
              >
                <UserCheck
                  size={16}
                  color={mode === 'EXISTENTE' ? theme.colors.white : theme.colors.primary}
                />
                <Text
                  style={[styles.tabText, mode === 'EXISTENTE' && styles.tabTextActive]}
                >
                  Veedor existente
                </Text>
              </Pressable>

              <Pressable
                onPress={() => setMode('SUSTITUTO_EXTERNO')}
                style={[
                  styles.tabBtn,
                  mode === 'SUSTITUTO_EXTERNO' && styles.tabBtnActive,
                ]}
              >
                <UserPlus
                  size={16}
                  color={
                    mode === 'SUSTITUTO_EXTERNO'
                      ? theme.colors.white
                      : theme.colors.primary
                  }
                />
                <Text
                  style={[
                    styles.tabText,
                    mode === 'SUSTITUTO_EXTERNO' && styles.tabTextActive,
                  ]}
                >
                  Sustituto externo
                </Text>
              </Pressable>
            </View>

            {mode === 'EXISTENTE' ? (
              <ScrollView style={{ maxHeight: 380 }}>
                {veedores.length === 0 ? (
                  <Text style={styles.emptyVeedores}>
                    No hay veedores registrados aún. Use la pestaña "Sustituto externo" para crear uno al instante.
                  </Text>
                ) : (
                  veedores.map((v) => {
                    const mesasAsignadas = mesas.filter(
                      (m) => m.veedorActivoId === v.id
                    ).length;
                    return (
                      <Pressable
                        key={v.id}
                        onPress={() =>
                          handleAsignarExistente(v.id, `${v.nombres} ${v.apellidos}`)
                        }
                        style={styles.veedorOption}
                      >
                        <View style={{ flex: 1 }}>
                          <Text style={styles.optName}>
                            {v.nombres} {v.apellidos}
                          </Text>
                          <Text style={styles.optMeta}>
                            CI: {v.cedula} · Cubre actualmente {mesasAsignadas} mesa
                            {mesasAsignadas === 1 ? '' : 's'}
                          </Text>
                        </View>
                        <Text style={styles.optSelect}>Elegir</Text>
                      </Pressable>
                    );
                  })
                )}
              </ScrollView>
            ) : (
              <ScrollView
                style={{ maxHeight: 430 }}
                keyboardShouldPersistTaps="handled"
              >
                <Text style={styles.subHint}>
                  Crea en el acto la cuenta de un veedor sustituto externo, envía su enlace SMTP y le asigna esta mesa.
                </Text>
                <ControlledInput
                  control={control}
                  name="cedula"
                  label="Cédula ecuatoriana"
                  placeholder="1750034066"
                  keyboardType="number-pad"
                  maxLength={10}
                />
                <ControlledInput
                  control={control}
                  name="nombres"
                  label="Nombres"
                  placeholder="Nombres completos"
                />
                <ControlledInput
                  control={control}
                  name="apellidos"
                  label="Apellidos"
                  placeholder="Apellidos completos"
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
                  placeholder="sustituto@correo.ec"
                  autoCapitalize="none"
                  keyboardType="email-address"
                />

                <Pressable
                  onPress={handleSubmit(onCreateSustituto)}
                  disabled={isSubmitting}
                  style={styles.createSubBtn}
                >
                  <Text style={styles.createSubBtnText}>
                    Crear sustituto y asignar JRV N.° {selectedMesa?.numeroJrv}
                  </Text>
                </Pressable>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.colors.background },
  list: { paddingHorizontal: 16, paddingTop: 14, gap: 12, paddingBottom: 16 },
  emptyState: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 20,
  },
  emptyStateText: {
    fontSize: 14,
    lineHeight: 21,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    padding: 15,
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: 12,
  },
  cardRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  jrvTitle: { fontSize: 17, fontWeight: '800', color: theme.colors.primary },
  veedorLine: { fontSize: 14, color: theme.colors.textSecondary, marginTop: 3 },
  veedorBold: { fontWeight: '700', color: theme.colors.text },
  avanceBadge: {
    backgroundColor: theme.colors.surfaceAlt,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 99,
  },
  avanceText: { fontSize: 11, fontWeight: '800', color: theme.colors.primary },
  assignBtn: {
    minHeight: 48,
    borderRadius: theme.radius.md,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  newAssignBtn: { backgroundColor: theme.colors.primary },
  replaceBtn: { backgroundColor: theme.colors.warning },
  assignBtnText: { color: theme.colors.white, fontSize: 15, fontWeight: '700' },
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
    maxHeight: '88%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalTitle: { fontSize: 18, fontWeight: '800', color: theme.colors.text },
  closeBtn: { padding: 6 },
  tabRow: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  tabBtn: {
    flex: 1,
    minHeight: 46,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: theme.colors.primary,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  tabBtnActive: { backgroundColor: theme.colors.primary },
  tabText: { fontSize: 14, fontWeight: '700', color: theme.colors.primary },
  tabTextActive: { color: theme.colors.white },
  emptyVeedores: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    padding: 20,
  },
  veedorOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    backgroundColor: theme.colors.background,
    marginBottom: 8,
  },
  optName: { fontSize: 15, fontWeight: '700', color: theme.colors.text },
  optMeta: { fontSize: 12, color: theme.colors.textSecondary, marginTop: 2 },
  optSelect: { fontSize: 14, fontWeight: '800', color: theme.colors.secondary },
  subHint: { fontSize: 13, color: theme.colors.textSecondary, marginBottom: 12 },
  createSubBtn: {
    minHeight: theme.touch.minButtonHeight,
    backgroundColor: theme.colors.secondary,
    borderRadius: theme.radius.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 6,
  },
  createSubBtnText: { color: theme.colors.white, fontSize: 15, fontWeight: '700' },
});