import { NcannyClient, type TokenStore } from '@ncanny/api-client';
import Constants from 'expo-constants';
import { resolveApiUrl } from './api-url';
import { SecureTokenStore } from './token-store';

export const tokenStore: TokenStore = new SecureTokenStore();

let client: NcannyClient | null = null;
let authFailureHandler: (() => void) | null = null;

function readConfiguredUrl(): string {
  const extra = Constants.expoConfig?.extra as { apiUrl?: unknown } | undefined;
  return resolveApiUrl(extra?.apiUrl);
}

/**
 * One client per app process, so the single-flight refresh in HttpClient
 * deduplicates across every screen.
 */
export function getApiClient(): NcannyClient {
  if (!client) {
    client = new NcannyClient({
      baseUrl: readConfiguredUrl(),
      tokenStore,
      onAuthFailure: () => authFailureHandler?.(),
    });
  }
  return client;
}

/** Registered by the auth store so an unrecoverable 401 signs the user out. */
export function onAuthFailure(handler: () => void): void {
  authFailureHandler = handler;
}
