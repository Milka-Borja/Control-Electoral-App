import * as FileSystem from 'expo-file-system/legacy';
import { IFileStoragePort } from '../../domain/ports';

const ACTAS_DIR = `${FileSystem.documentDirectory ?? ''}actas_evidencias/`;

export class FileSystemPhotoAdapter implements IFileStoragePort {
  async hasSufficientStorage(minMegabytes = 40): Promise<boolean> {
    try {
      const freeBytes = await FileSystem.getFreeDiskStorageAsync();
      const freeMb = freeBytes / (1024 * 1024);
      return freeMb >= minMegabytes;
    } catch {
      // Si el SO no reporta espacio, permitir continuar y controlar fallo al copiar
      return true;
    }
  }

  async persistPhotoLocally(tempUri: string, clientUuid: string): Promise<string> {
    const dirInfo = await FileSystem.getInfoAsync(ACTAS_DIR);
    if (!dirInfo.exists) {
      await FileSystem.makeDirectoryAsync(ACTAS_DIR, { intermediates: true });
    }

    const destinationUri = `${ACTAS_DIR}acta_${clientUuid}.jpg`;
    if (tempUri === destinationUri) return destinationUri;

    await FileSystem.copyAsync({
      from: tempUri,
      to: destinationUri,
    });

    return destinationUri;
  }

  async deleteLocalPhotoIfExists(localUri: string): Promise<void> {
    try {
      if (!localUri || !localUri.startsWith(ACTAS_DIR)) return;
      const info = await FileSystem.getInfoAsync(localUri);
      if (info.exists) {
        await FileSystem.deleteAsync(localUri, { idempotent: true });
      }
    } catch {
      // Limpieza no crítica; no interrumpe el flujo
    }
  }
}