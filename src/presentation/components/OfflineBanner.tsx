import { CloudOff, RefreshCw } from 'lucide-react-native';
import React from 'react';
import { StyleSheet, Text } from 'react-native';
import Animated, { FadeInDown, FadeOutUp } from 'react-native-reanimated';
import { useSyncStore } from '../store/syncStore';
import { theme } from '../theme/theme';

export function OfflineBanner() {
  const { isOnline, isSyncing, pendingCount } = useSyncStore();

  if (isOnline && !isSyncing && pendingCount === 0) return null;

  const bg = !isOnline
    ? theme.colors.warning
    : isSyncing
      ? theme.colors.info
      : theme.colors.primaryLight;

  const text = !isOnline
    ? `Sin conexión · Guardando en el celular (${pendingCount} pendiente${pendingCount === 1 ? '' : 's'})`
    : isSyncing
      ? `Sincronizando ${pendingCount} acta${pendingCount === 1 ? '' : 's'} con el servidor...`
      : `${pendingCount} acta${pendingCount === 1 ? '' : 's'} lista${pendingCount === 1 ? '' : 's'} para sincronizar`;

  return (
    <Animated.View
      entering={FadeInDown.duration(220)}
      exiting={FadeOutUp.duration(180)}
      style={[styles.banner, { backgroundColor: bg }]}
    >
      {!isOnline ? (
        <CloudOff size={18} color={theme.colors.white} />
      ) : (
        <RefreshCw size={18} color={theme.colors.white} />
      )}
      <Text style={styles.text}>{text}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  text: {
    color: theme.colors.white,
    fontSize: 13,
    fontWeight: '700',
  },
});