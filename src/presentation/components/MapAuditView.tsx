import React from 'react';
import { StyleSheet, View } from 'react-native';
import { WebView } from 'react-native-webview';
import { DISTANCIA_MAXIMA_RECINTO_METROS } from '../../domain/utils/geoDistance';
import { theme } from '../theme/theme';

interface Props {
  recintoNombre: string;
  recintoLat: number;
  recintoLon: number;
  actaLat: number;
  actaLon: number;
  alertaUbicacion: boolean;
}

export function MapAuditView({
  recintoNombre,
  recintoLat,
  recintoLon,
  actaLat,
  actaLon,
  alertaUbicacion,
}: Props) {
  const safeName = recintoNombre.replace(/'/g, "\\'");
  const circleColor = alertaUbicacion ? '#DC2626' : '#0F9D58';

  const html = `<!DOCTYPE html>
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
        const map = L.map('map', { zoomControl: true }).setView([${recintoLat}, ${recintoLon}], 16);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 19,
          attribution: '&copy; OpenStreetMap'
        }).addTo(map);

        const recintoMarker = L.marker([${recintoLat}, ${recintoLon}])
          .addTo(map)
          .bindPopup('<b>Recinto:</b> ${safeName}');

        const actaMarker = L.circleMarker([${actaLat}, ${actaLon}], {
          radius: 9,
          color: '#FFFFFF',
          weight: 3,
          fillColor: '${alertaUbicacion ? '#DC2626' : '#0D3B66'}',
          fillOpacity: 1
        }).addTo(map).bindPopup('<b>Captura del acta</b>');

        L.circle([${recintoLat}, ${recintoLon}], {
          radius: ${DISTANCIA_MAXIMA_RECINTO_METROS},
          color: '${circleColor}',
          fillColor: '${circleColor}',
          fillOpacity: 0.14,
          weight: 2
        }).addTo(map);

        const group = L.featureGroup([recintoMarker, actaMarker]);
        map.fitBounds(group.getBounds().pad(0.35));
      </script>
    </body>
  </html>`;

  return (
    <View style={styles.container}>
      <WebView originWhitelist={['*']} source={{ html }} style={styles.webview} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 250,
    borderRadius: theme.radius.md,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: theme.colors.border,
  },
  webview: {
    flex: 1,
  },
});