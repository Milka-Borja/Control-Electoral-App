import * as SecureStore from 'expo-secure-store';

const CHUNK_SIZE = 1800;

export const secureStoreAdapter = {
  async getItem(key: string): Promise<string | null> {
    const countStr = await SecureStore.getItemAsync(`${key}__chunks`);
    if (!countStr) {
      return SecureStore.getItemAsync(key);
    }

    const count = parseInt(countStr, 10);
    if (Number.isNaN(count) || count <= 0) return null;

    const parts: string[] = [];
    for (let i = 0; i < count; i++) {
      const part = await SecureStore.getItemAsync(`${key}__chunk_${i}`);
      if (part === null) return null;
      parts.push(part);
    }
    return parts.join('');
  },

  async setItem(key: string, value: string): Promise<void> {
    await this.removeItem(key);

    if (value.length <= CHUNK_SIZE) {
      await SecureStore.setItemAsync(key, value);
      return;
    }

    const totalChunks = Math.ceil(value.length / CHUNK_SIZE);
    for (let i = 0; i < totalChunks; i++) {
      const chunk = value.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE);
      await SecureStore.setItemAsync(`${key}__chunk_${i}`, chunk);
    }
    await SecureStore.setItemAsync(`${key}__chunks`, String(totalChunks));
  },

  async removeItem(key: string): Promise<void> {
    const countStr = await SecureStore.getItemAsync(`${key}__chunks`);
    if (countStr) {
      const count = parseInt(countStr, 10);
      if (!Number.isNaN(count)) {
        for (let i = 0; i < count; i++) {
          await SecureStore.deleteItemAsync(`${key}__chunk_${i}`);
        }
      }
      await SecureStore.deleteItemAsync(`${key}__chunks`);
    }
    await SecureStore.deleteItemAsync(key);
  },
};