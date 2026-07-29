import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const memoryStorage = new Map<string, string>();

export async function secureSetItem(key: string, value: string): Promise<void> {
  if (Platform.OS === 'web') {
    memoryStorage.set(key, value);
    return;
  }

  await SecureStore.setItemAsync(key, value);
}

export async function secureGetItem(key: string): Promise<string | null> {
  if (Platform.OS === 'web') {
    return memoryStorage.get(key) ?? null;
  }

  return SecureStore.getItemAsync(key);
}

export async function secureDeleteItem(key: string): Promise<void> {
  if (Platform.OS === 'web') {
    memoryStorage.delete(key);
    return;
  }

  await SecureStore.deleteItemAsync(key);
}
