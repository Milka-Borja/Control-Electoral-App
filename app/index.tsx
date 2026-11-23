import LottieView from 'lottie-react-native';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { theme } from '../src/presentation/theme/theme';

export default function SplashIndexRoute() {
  return (
    <View style={styles.container}>
      <LottieView
        source={require('../assets/lottie/loading.json')}
        autoPlay
        loop
        style={styles.lottie}
      />
      <Text style={styles.brand}>{theme.brand.name}</Text>
      <Text style={styles.sub}>{theme.brand.jurisdiction}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  lottie: {
    width: 140,
    height: 140,
  },
  brand: {
    color: theme.colors.white,
    fontSize: 22,
    fontWeight: '800',
    marginTop: 12,
    textAlign: 'center',
  },
  sub: {
    color: theme.colors.accent,
    fontSize: 15,
    fontWeight: '600',
    marginTop: 6,
  },
});