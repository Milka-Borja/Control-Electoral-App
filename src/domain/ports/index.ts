export interface GpsReading {
  latitud: number;
  longitud: number;
  precisionGps: number;
  timestamp: number;
}

export interface SharpnessResult {
  isSharp: boolean;
  score: number;
  brightness: number;
  message: string;
}

export interface ILocationPort {
  /** Toma varias lecturas GPS y retorna la de mejor precisión (ADR-04, S-06). */
  captureBestAccuracyLocation(): Promise<GpsReading>;
}

export interface ISharpnessPort {
  /** Evalúa nitidez (varianza Laplaciana) y brillo antes de confirmar (ADR-04, RF-11). */
  analyzeImage(photoUri: string): Promise<SharpnessResult>;
}

export interface IFileStoragePort {
  /** Valida espacio libre en disco antes de guardar la evidencia local (ADR-03). */
  hasSufficientStorage(minMegabytes?: number): Promise<boolean>;
  persistPhotoLocally(tempUri: string, clientUuid: string): Promise<string>;
  deleteLocalPhotoIfExists(localUri: string): Promise<void>;
}

export interface INetworkMonitorPort {
  isOnline(): Promise<boolean>;
  subscribe(listener: (isOnline: boolean) => void): () => void;
}

export interface ICrashMonitorPort {
  captureNonFatal(error: unknown, context: { screen: string; action: string; extra?: Record<string, unknown> }): void;
  addBreadcrumb(category: string, message: string, data?: Record<string, unknown>): void;
  setSafeUserContext(userId: string, rol: string): void;
  clearUserContext(): void;
  triggerControlledCrashForDemo(): void;
}