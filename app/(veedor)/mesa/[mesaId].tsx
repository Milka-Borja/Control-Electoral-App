import { useLocalSearchParams } from 'expo-router';
import React from 'react';
import { MesaDetalleScreen } from '../../../src/presentation/screens/veedor/MesaDetalleScreen';

export default function MesaDetalleRoute() {
  const params = useLocalSearchParams<{
    mesaId: string;
    numeroJrv?: string;
    genero?: string;
    recintoNombre?: string;
    recintoLat?: string;
    recintoLon?: string;
  }>();

  return (
    <MesaDetalleScreen
      mesaId={params.mesaId}
      numeroJrv={params.numeroJrv ?? '1'}
      genero={params.genero ?? 'M'}
      recintoNombre={params.recintoNombre ?? 'Recinto'}
      recintoLat={params.recintoLat ?? '0'}
      recintoLon={params.recintoLon ?? '0'}
    />
  );
}