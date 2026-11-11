import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const KEY = 'my_ummah_token';

/**
 * Where the sign-in token lives between app launches: the Keychain on iOS and
 * the Keystore on Android. Web (used only for development previews) has no
 * secure store, so it falls back to localStorage.
 */
export const tokenStorage = {
  async get(): Promise<string | null> {
    try {
      if (Platform.OS === 'web') return globalThis.localStorage?.getItem(KEY) ?? null;
      return await SecureStore.getItemAsync(KEY);
    } catch {
      return null;
    }
  },
  async set(token: string | null) {
    try {
      if (Platform.OS === 'web') {
        if (token) globalThis.localStorage?.setItem(KEY, token);
        else globalThis.localStorage?.removeItem(KEY);
      } else if (token) await SecureStore.setItemAsync(KEY, token);
      else await SecureStore.deleteItemAsync(KEY);
    } catch {
      // Losing the saved token only means signing in again next launch.
    }
  },
};
