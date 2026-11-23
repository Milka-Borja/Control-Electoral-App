import { useLocalSearchParams } from 'expo-router';
import React from 'react';
import { DignidadElectoral } from '../../src/domain/entities';
import { ActaFormScreen } from '../../src/presentation/screens/veedor/ActaFormScreen';

export default function RecintoEditarActaRoute() {
  const params = useLocalSearchParams<{
    mesaId: string;
    dignidad: DignidadElectoral;
    numeroJrv?: string;
    recintoNombre?: string;
    recintoLat?: string;
    recintoLon?: string;
  }>();

  return (
    <ActaFormScreen
      mesaId={params.mesaId}
      dignidad={params.dignidad ?? 'ALCALDIA'}
      numeroJrv={params.numeroJrv ?? '1'}
      recintoNombre={params.recintoNombre ?? 'Recinto'}
      recintoLat={Number(params.recintoLat ?? 0)}
      recintoLon={Number(params.recintoLon ?? 0)}
    />
  );
}