import LottieView, { AnimationObject } from 'lottie-react-native';
import React from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, ZoomIn } from 'react-native-reanimated';
import { FeedbackType, useFeedbackStore } from '../store/feedbackStore';
import { theme } from '../theme/theme';

const LOTTIE_SOURCES: Record<FeedbackType, AnimationObject> = {
  loading: require('../../../assets/lottie/loading.json'),
  syncing: require('../../../assets/lottie/syncing.json'),
  success: require('../../../assets/lottie/success.json'),
  error: require('../../../assets/lottie/error.json'),
  warning: require('../../../assets/lottie/warning.json'),
};

const ACCENT_BY_TYPE: Record<FeedbackType, string> = {
  loading: theme.colors.primary,
  syncing: theme.colors.info,
  success: theme.colors.secondary,
  error: theme.colors.danger,
  warning: theme.colors.warning,
};

export function FeedbackOverlay() {
  const { feedback, hideFeedback } = useFeedbackStore();

  if (!feedback.visible) return null;

  const accent = ACCENT_BY_TYPE[feedback.type];
  const isLoop = feedback.type === 'loading' || feedback.type === 'syncing';

  const handlePress = () => {
    const cb = feedback.onAction;
    hideFeedback();
    cb?.();
  };

  return (
    <Modal transparent visible animationType="none" statusBarTranslucent>
      <Animated.View entering={FadeIn.duration(180)} style={styles.backdrop}>
        <Animated.View entering={ZoomIn.duration(220)} style={styles.card}>
          <View style={[styles.topBar, { backgroundColor: accent }]} />
          <LottieView
            source={LOTTIE_SOURCES[feedback.type]}
            autoPlay
            loop={isLoop}
            style={styles.lottie}
          />
          <Text style={styles.title}>{feedback.title}</Text>
          {feedback.message ? <Text style={styles.message}>{feedback.message}</Text> : null}

          {!feedback.blocking ? (
            <Pressable
              onPress={handlePress}
              style={({ pressed }) => [
                styles.button,
                { backgroundColor: accent, opacity: pressed ? 0.85 : 1 },
              ]}
            >
              <Text style={styles.buttonText}>{feedback.actionLabel ?? 'Aceptar'}</Text>
            </Pressable>
          ) : null}
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(8, 38, 68, 0.62)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.lg,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.lg,
    alignItems: 'center',
    overflow: 'hidden',
    elevation: 10,
  },
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 6,
  },
  lottie: {
    width: 112,
    height: 112,
    marginTop: 6,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.colors.text,
    textAlign: 'center',
    marginTop: 4,
  },
  message: {
    fontSize: 15,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 22,
  },
  button: {
    width: '100%',
    minHeight: theme.touch.minButtonHeight,
    borderRadius: theme.radius.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: theme.spacing.lg,
  },
  buttonText: {
    color: theme.colors.white,
    fontSize: 16,
    fontWeight: '700',
  },
});