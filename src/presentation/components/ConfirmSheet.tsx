import { AlertTriangle, HelpCircle } from 'lucide-react-native';
import React from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, SlideInDown } from 'react-native-reanimated';
import { useFeedbackStore } from '../store/feedbackStore';
import { theme } from '../theme/theme';

export function ConfirmSheet() {
  const { confirm, closeConfirm } = useFeedbackStore();

  if (!confirm.visible) return null;

  const handleConfirm = () => {
    const cb = confirm.onConfirm;
    closeConfirm();
    cb?.();
  };

  return (
    <Modal transparent visible animationType="none" statusBarTranslucent>
      <Animated.View entering={FadeIn.duration(160)} style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={closeConfirm} />
        <Animated.View entering={SlideInDown.duration(240)} style={styles.sheet}>
          <View style={styles.handle} />
          <View style={styles.headerRow}>
            <View
              style={[
                styles.iconWrap,
                {
                  backgroundColor: confirm.destructive
                    ? theme.colors.dangerSoft
                    : theme.colors.accentSoft,
                },
              ]}
            >
              {confirm.destructive ? (
                <AlertTriangle size={24} color={theme.colors.danger} />
              ) : (
                <HelpCircle size={24} color={theme.colors.primary} />
              )}
            </View>
            <Text style={styles.title}>{confirm.title}</Text>
          </View>

          <Text style={styles.message}>{confirm.message}</Text>

          <View style={styles.actions}>
            <Pressable onPress={closeConfirm} style={styles.cancelBtn}>
              <Text style={styles.cancelText}>{confirm.cancelLabel}</Text>
            </Pressable>
            <Pressable
              onPress={handleConfirm}
              style={[
                styles.confirmBtn,
                {
                  backgroundColor: confirm.destructive
                    ? theme.colors.danger
                    : theme.colors.primary,
                },
              ]}
            >
              <Text style={styles.confirmText}>{confirm.confirmLabel}</Text>
            </Pressable>
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: theme.spacing.lg,
    paddingBottom: 32,
  },
  handle: {
    width: 44,
    height: 5,
    borderRadius: 99,
    backgroundColor: theme.colors.border,
    alignSelf: 'center',
    marginBottom: 16,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    flex: 1,
    fontSize: 19,
    fontWeight: '700',
    color: theme.colors.text,
  },
  message: {
    fontSize: 15,
    color: theme.colors.textSecondary,
    lineHeight: 22,
    marginTop: 12,
    marginBottom: 20,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelBtn: {
    flex: 1,
    minHeight: theme.touch.minButtonHeight,
    borderRadius: theme.radius.md,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
  },
  confirmBtn: {
    flex: 1,
    minHeight: theme.touch.minButtonHeight,
    borderRadius: theme.radius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  confirmText: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.white,
  },
});