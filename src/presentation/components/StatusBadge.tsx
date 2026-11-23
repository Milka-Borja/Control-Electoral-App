import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { EstadoSyncActa } from '../../domain/entities';
import { SYNC_STATUS_META, theme } from '../theme/theme';

interface Props {
  status: EstadoSyncActa | 'PENDIENTE';
}

export function StatusBadge({ status }: Props) {
  const meta = SYNC_STATUS_META[status] ?? SYNC_STATUS_META.PENDIENTE;
  return (
    <View style={[styles.badge, { backgroundColor: meta.bg }]}>
      <View style={[styles.dot, { backgroundColor: meta.color }]} />
      <Text style={[styles.text, { color: meta.color }]}>{meta.label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: theme.radius.pill,
    gap: 6,
    alignSelf: 'flex-start',
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 99,
  },
  text: {
    fontSize: 12,
    fontWeight: '700',
  },
});