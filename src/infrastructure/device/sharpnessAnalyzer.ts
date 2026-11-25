import * as ImageManipulator from 'expo-image-manipulator';
import jpeg from 'jpeg-js';
import { ISharpnessPort, SharpnessResult } from '../../domain/ports';

// Ajustar este umbral probando actas reales del CNE en tu celular físico (ADR-04)
export const SHARPNESS_THRESHOLD = 950;
const MIN_BRIGHTNESS = 18;
const MAX_BRIGHTNESS = 242;

const BASE64_CHARS =
  'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

function base64ToUint8Array(base64: string): Uint8Array {
  const clean = base64.replace(/[^A-Za-z0-9+/=]/g, '');
  let padding = 0;
  if (clean.endsWith('==')) padding = 2;
  else if (clean.endsWith('=')) padding = 1;

  const byteLength = (clean.length * 3) / 4 - padding;
  const bytes = new Uint8Array(byteLength);

  let byteIdx = 0;
  for (let i = 0; i < clean.length; i += 4) {
    const c1 = BASE64_CHARS.indexOf(clean[i]);
    const c2 = BASE64_CHARS.indexOf(clean[i + 1]);
    const c3 = BASE64_CHARS.indexOf(clean[i + 2]);
    const c4 = BASE64_CHARS.indexOf(clean[i + 3]);

    const triplet = (c1 << 18) | (c2 << 12) | ((c3 & 63) << 6) | (c4 & 63);

    if (byteIdx < byteLength) bytes[byteIdx++] = (triplet >> 16) & 255;
    if (byteIdx < byteLength) bytes[byteIdx++] = (triplet >> 8) & 255;
    if (byteIdx < byteLength) bytes[byteIdx++] = triplet & 255;
  }

  return bytes;
}

export class SharpnessAnalyzer implements ISharpnessPort {
  async analyzeImage(photoUri: string): Promise<SharpnessResult> {
    // 1. Reducir copia temporal en memoria a 180px de ancho para análisis rápido offline
    const manipulated = await ImageManipulator.manipulateAsync(
      photoUri,
      [{ resize: { width: 320 } }],
      {
        compress: 0.9,
        format: ImageManipulator.SaveFormat.JPEG,
        base64: true,
      }
    );

    if (!manipulated.base64) {
      throw new Error('No se pudo procesar la imagen para validar su nitidez.');
    }

    // 2. Decodificar JPEG a píxeles RGBA y pasar a luminancia (escala de grises)
    const rawBytes = base64ToUint8Array(manipulated.base64);
    const decoded = jpeg.decode(rawBytes, { useTArray: true });
    const { width, height, data } = decoded;

    const totalPixels = width * height;
    const gray = new Float32Array(totalPixels);
    let brightnessSum = 0;

    for (let i = 0, p = 0; i < data.length; i += 4, p++) {
      const lum = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
      gray[p] = lum;
      brightnessSum += lum;
    }

    const avgBrightness = Math.round((brightnessSum / totalPixels) * 10) / 10;

    // 3. Aplicar kernel Laplaciano en la zona central (60% interior donde están los votos)
    const startX = Math.max(1, Math.floor(width * 0.2));
    const endX = Math.min(width - 1, Math.ceil(width * 0.8));
    const startY = Math.max(1, Math.floor(height * 0.2));
    const endY = Math.min(height - 1, Math.ceil(height * 0.8));

    let lapSum = 0;
    let lapSqSum = 0;
    let count = 0;

    for (let y = startY; y < endY; y++) {
      const row = y * width;
      for (let x = startX; x < endX; x++) {
        const idx = row + x;
        const lap =
          gray[idx - width] +
          gray[idx + width] +
          gray[idx - 1] +
          gray[idx + 1] -
          4 * gray[idx];

        lapSum += lap;
        lapSqSum += lap * lap;
        count++;
      }
    }
    const mean = lapSum / count;
    const variance = lapSqSum / count - mean * mean;
    const score = Math.round(variance * 10) / 10;

    if (avgBrightness < MIN_BRIGHTNESS) {
      return {
        isSharp: false,
        score,
        brightness: avgBrightness,
        message:
          'La fotografía está demasiado oscura y no permite leer el acta. Busque mejor luz o active el flash.',
      };
    }

    if (avgBrightness > MAX_BRIGHTNESS) {
      return {
        isSharp: false,
        score,
        brightness: avgBrightness,
        message:
          'La fotografía está sobreexpuesta (demasiado reflejo). Evite el brillo directo sobre el acta.',
      };
    }

    if (score < SHARPNESS_THRESHOLD) {
      return {
        isSharp: false,
        score,
        brightness: avgBrightness,
        message:
          'La fotografía se ve borrosa o desenfocada. Mantenga firme el celular y enfoque los números del acta.',
      };
    }

    return {
      isSharp: true,
      score,
      brightness: avgBrightness,
      message: 'Fotografía nítida y legible. Revise los datos antes de confirmar.',
    };
  }
}