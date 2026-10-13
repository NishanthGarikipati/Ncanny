import type { TokenStore } from '@ncanny/api-client';
import type { AuthTokens } from '@ncanny/types';
import * as SecureStore from 'expo-secure-store';
import { assembleTokens } from './stored-tokens';

const ACCESS_KEY = 'ncanny.access.v1';
const REFRESH_KEY = 'ncanny.refresh.v1';
const EXPIRES_KEY = 'ncanny.expires.v1';

/**
 * Tokens live in the platform secure store (Keychain / EncryptedSharedPreferences),
 * which is the mobile equivalent of the httpOnly cookie the web app will move
 * to before beta (DL-0012).
 */
export class SecureTokenStore implements TokenStore {
  async get(): Promise<AuthTokens | null> {
    const [accessToken, refreshToken, expiresRaw] = await Promise.all([
      SecureStore.getItemAsync(ACCESS_KEY),
      SecureStore.getItemAsync(REFRESH_KEY),
      SecureStore.getItemAsync(EXPIRES_KEY),
    ]);
    return assembleTokens(accessToken, refreshToken, expiresRaw);
  }

  async set(tokens: AuthTokens): Promise<void> {
    await Promise.all([
      SecureStore.setItemAsync(ACCESS_KEY, tokens.accessToken),
      SecureStore.setItemAsync(REFRESH_KEY, tokens.refreshToken),
      SecureStore.setItemAsync(EXPIRES_KEY, String(tokens.expiresIn)),
    ]);
  }

  async clear(): Promise<void> {
    await Promise.all([
      SecureStore.deleteItemAsync(ACCESS_KEY),
      SecureStore.deleteItemAsync(REFRESH_KEY),
      SecureStore.deleteItemAsync(EXPIRES_KEY),
    ]);
  }
}
