import { useLocalSearchParams } from 'expo-router';
import React from 'react';
import { ActaAuditoriaScreen } from '../../../src/presentation/screens/provincial/ActaAuditoriaScreen';

export default function ActaAuditoriaRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <ActaAuditoriaScreen actaId={id} />;
}