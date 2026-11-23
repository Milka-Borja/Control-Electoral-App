export const DISTANCIA_MAXIMA_RECINTO_METROS = 300;
const RADIO_TIERRA_METROS = 6_371_000;

function toRadians(grados: number): number {
  return (grados * Math.PI) / 180;
}

/**
 * Calcula la distancia en metros entre dos coordenadas GPS mediante la fórmula de Haversine.
 */
export function calcularDistanciaMetros(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(RADIO_TIERRA_METROS * c * 100) / 100;
}

export function evaluarUbicacionActa(
  latActa: number,
  lonActa: number,
  latRecinto: number,
  lonRecinto: number
): { distanciaMetros: number; alertaUbicacion: boolean } {
  const distanciaMetros = calcularDistanciaMetros(
    latActa,
    lonActa,
    latRecinto,
    lonRecinto
  );

  return {
    distanciaMetros,
    alertaUbicacion: distanciaMetros > DISTANCIA_MAXIMA_RECINTO_METROS,
  };
}