import * as Location from 'expo-location';
import { GpsReading, ILocationPort } from '../../domain/ports';

const MAX_READINGS = 4;
const BURST_TIMEOUT_MS = 3500;
const IDEAL_ACCURACY_METERS = 12;

export class GpsLocationAdapter implements ILocationPort {
  async captureBestAccuracyLocation(): Promise<GpsReading> {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      throw new Error(
        'Permiso de ubicación denegado. El GPS es obligatorio para registrar un acta electoral.'
      );
    }

    const servicesEnabled = await Location.hasServicesEnabledAsync();
    if (!servicesEnabled) {
      throw new Error(
        'El GPS del dispositivo está desactivado. Actívelo para capturar la ubicación del acta.'
      );
    }

    const readings: GpsReading[] = [];

    // Ráfaga de múltiples lecturas para elegir la de menor error (ADR-04)
    await new Promise<void>((resolve) => {
      let finished = false;
      let subscription: Location.LocationSubscription | null = null;

      const finish = () => {
        if (finished) return;
        finished = true;
        clearTimeout(timer);
        subscription?.remove();
        resolve();
      };

      const timer = setTimeout(finish, BURST_TIMEOUT_MS);

      Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.BestForNavigation,
          timeInterval: 500,
          distanceInterval: 0,
        },
        (loc) => {
          readings.push({
            latitud: loc.coords.latitude,
            longitud: loc.coords.longitude,
            precisionGps: Math.round((loc.coords.accuracy ?? 999) * 10) / 10,
            timestamp: loc.timestamp,
          });

          const bestSoFar = Math.min(...readings.map((r) => r.precisionGps));
          if (
            readings.length >= MAX_READINGS ||
            (readings.length >= 2 && bestSoFar <= IDEAL_ACCURACY_METERS)
          ) {
            finish();
          }
        }
      )
        .then((sub) => {
          if (finished) {
            sub.remove();
          } else {
            subscription = sub;
          }
        })
        .catch(finish);
    });

    // Respaldo inmediato si la ráfaga no devolvió lectura dentro del tiempo
    if (readings.length === 0) {
      const fallback = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      readings.push({
        latitud: fallback.coords.latitude,
        longitud: fallback.coords.longitude,
        precisionGps: Math.round((fallback.coords.accuracy ?? 999) * 10) / 10,
        timestamp: fallback.timestamp,
      });
    }

    // Retornar la lectura con menor margen de error (accuracy)
    readings.sort((a, b) => a.precisionGps - b.precisionGps);
    return readings[0];
  }
}