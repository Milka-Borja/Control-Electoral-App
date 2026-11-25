import React, { useState } from 'react';
import {
  Image,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import type { ImageSourcePropType } from 'react-native';
import { getPartyColor } from '../theme/theme';

const PARTY_LOGOS: Record<
  number,
  { sigla: string; source: ImageSourcePropType }
> = {
  5: {
    sigla: 'RC',
    source: require('../../../assets/Movimiento_Revolucion_Ciudadana.png'),
  },
  6: {
    sigla: 'PSC',
    source: require('../../../assets/Logo_Partido_Social_Crsitiano_2026.png'),
  },
  7: {
    sigla: 'ADN',
    source: require('../../../assets/LOGO_ADN7.png'),
  },
  12: {
    sigla: 'ID',
    source: require('../../../assets/Izquierda_democratica_2018.png'),
  },
  21: {
    sigla: 'CREO',
    source: require('../../../assets/Movimiento_CREO_-_Lista_21.png'),
  },
};

const PARTY_LIST_BY_SIGLA: Record<string, number> = {
  RC: 5,
  PSC: 6,
  ADN: 7,
  ID: 12,
  CREO: 21,
};

interface PartyLogoBadgeProps {
  numeroLista: number;
  sigla?: string;
  size?: number;
}

export function PartyLogoBadge({
  numeroLista,
  sigla,
  size = 42,
}: PartyLogoBadgeProps) {
  const [imageUnavailable, setImageUnavailable] = useState(false);
  const listNumber =
    PARTY_LOGOS[numeroLista]
      ? numeroLista
      : sigla
        ? PARTY_LIST_BY_SIGLA[sigla.trim().toUpperCase()]
        : undefined;
  const party = listNumber === undefined ? undefined : PARTY_LOGOS[listNumber];
  const color = getPartyColor(listNumber ?? numeroLista, sigla);

  return (
    <View
      style={[
        styles.container,
        {
          width: size,
          height: size,
          borderRadius: size * 0.22,
          borderColor: color,
        },
      ]}
      accessible
      accessibilityLabel={
        party ? `Logotipo oficial de ${party.sigla}` : `Lista ${numeroLista}`
      }
    >
      {party && !imageUnavailable ? (
        <Image
          source={party.source}
          style={{ width: size - 8, height: size - 8 }}
          resizeMode="contain"
          onError={() => setImageUnavailable(true)}
        />
      ) : (
        <Text style={[styles.fallback, { color, fontSize: size * 0.3 }]}>
          L{numeroLista}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    overflow: 'hidden',
  },
  fallback: { fontWeight: '800', textAlign: 'center' },
});
