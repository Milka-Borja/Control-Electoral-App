import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { WebView, WebViewMessageEvent } from 'react-native-webview';
import * as Location from 'expo-location';
import { theme } from '../theme/theme';

interface MapPickerViewProps {
  latitude: number;
  longitude: number;
  onLocationSelect: (lat: number, lng: number) => void;
}

const DEFAULT_LATITUDE = -0.2105;
const DEFAULT_LONGITUDE = -78.4893;

export function MapPickerView({
  latitude,
  longitude,
  onLocationSelect,
}: MapPickerViewProps) {
  const webViewRef = useRef<WebView>(null);
  const [initialLocation] = useState({ latitude, longitude });
  const [mapReady, setMapReady] = useState(false);
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  const safeLatitude = Number.isFinite(latitude) ? latitude : DEFAULT_LATITUDE;
  const safeLongitude = Number.isFinite(longitude) ? longitude : DEFAULT_LONGITUDE;

  const html = useMemo(
    () => `<!DOCTYPE html>
      <html>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0" />
          <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
          <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
          <style>
            html, body, #map { margin: 0; padding: 0; width: 100%; height: 100%; }
          </style>
        </head>
        <body>
          <div id="map"></div>
          <script>
            const map = L.map('map', { zoomControl: true })
              .setView([${initialLocation.latitude}, ${initialLocation.longitude}], 15);
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
              maxZoom: 19,
              attribution: '&copy; OpenStreetMap'
            }).addTo(map);

            const marker = L.marker(
              [${initialLocation.latitude}, ${initialLocation.longitude}],
              { draggable: true }
            ).addTo(map);

            function selectLocation(lat, lng) {
              marker.setLatLng([lat, lng]);
              map.panTo([lat, lng]);
              window.ReactNativeWebView.postMessage(JSON.stringify({ lat, lng }));
            }

            window.setSelectedLocation = function(lat, lng) {
              marker.setLatLng([lat, lng]);
              map.panTo([lat, lng]);
            };

            map.on('click', function(event) {
              selectLocation(event.latlng.lat, event.latlng.lng);
            });

            marker.on('dragend', function(event) {
              const position = event.target.getLatLng();
              selectLocation(position.lat, position.lng);
            });
          </script>
        </body>
      </html>`,
    [initialLocation]
  );
  const source = useMemo(() => ({ html }), [html]);

  useEffect(() => {
    if (!mapReady) return;
    webViewRef.current?.injectJavaScript(
      `window.setSelectedLocation(${safeLatitude}, ${safeLongitude}); true;`
    );
  }, [mapReady, safeLatitude, safeLongitude]);

  const handleMessage = (event: WebViewMessageEvent) => {
    let coordinates: unknown;
    try {
      coordinates = JSON.parse(event.nativeEvent.data);
    } catch (error) {
      console.warn('MapPickerView could not parse a location message.', error);
      return;
    }
    if (
      typeof coordinates !== 'object' ||
      coordinates === null ||
      !('lat' in coordinates) ||
      !('lng' in coordinates)
    ) {
      console.warn('MapPickerView received an invalid location message.');
      return;
    }

    const { lat, lng } = coordinates;
    if (typeof lat !== 'number' || typeof lng !== 'number') {
      console.warn('MapPickerView received non-numeric coordinates.');
      return;
    }
    onLocationSelect(lat, lng);
  };

  const useCurrentLocation = async () => {
    setIsGettingLocation(true);
    setLocationError(null);
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (!permission.granted) {
        setLocationError('Permite el acceso a tu ubicación para usar el GPS.');
        return;
      }

      const currentPosition = await Location.getCurrentPositionAsync({});
      onLocationSelect(
        currentPosition.coords.latitude,
        currentPosition.coords.longitude
      );
    } catch (error) {
      setLocationError(
        error instanceof Error
          ? error.message
          : 'No se pudo obtener tu ubicación actual.'
      );
    } finally {
      setIsGettingLocation(false);
    }
  };

  return (
    <>
      <View style={styles.container}>
        <WebView
          ref={webViewRef}
          originWhitelist={['*']}
          source={source}
          style={styles.webview}
          onLoadEnd={() => setMapReady(true)}
          onMessage={handleMessage}
        />
        <Pressable
          onPress={useCurrentLocation}
          disabled={isGettingLocation}
          style={styles.locationButton}
        >
          {isGettingLocation ? (
            <ActivityIndicator size="small" color={theme.colors.primary} />
          ) : (
            <Text style={styles.locationButtonText}>
              Usar mi ubicación GPS actual
            </Text>
          )}
        </Pressable>
      </View>
      {locationError ? (
        <Text accessibilityRole="alert" style={styles.locationError}>
          {locationError}
        </Text>
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 220,
    borderRadius: theme.radius.md,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: theme.colors.border,
  },
  webview: {
    flex: 1,
  },
  locationButton: {
    position: 'absolute',
    top: 10,
    left: 10,
    minHeight: 40,
    paddingHorizontal: 12,
    borderRadius: theme.radius.sm,
    backgroundColor: theme.colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  locationButtonText: {
    color: theme.colors.primary,
    fontSize: 13,
    fontWeight: '700',
  },
  locationError: {
    color: theme.colors.danger,
    fontSize: 12,
    marginTop: 6,
  },
});
