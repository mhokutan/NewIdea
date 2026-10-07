// Small values kept on this device (SecureStore on phones, localStorage on web). Never required to work.
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

export async function getLocal(key: string): Promise<string | null> {
  try {
    if (Platform.OS === 'web') return globalThis.localStorage?.getItem(key) ?? null;
    return await SecureStore.getItemAsync(key);
  } catch { return null; }
}

export async function setLocal(key: string, value: string) {
  try {
    if (Platform.OS === 'web') globalThis.localStorage?.setItem(key, value);
    else await SecureStore.setItemAsync(key, value);
  } catch {}
}

/** Last time the Activity screen was opened (ISO time), for the dot on the bell. */
export const ACTIVITY_SEEN = 'pv_activity_seen';
