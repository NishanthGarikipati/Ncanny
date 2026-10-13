import { NcannyClient, type TokenStore } from '@ncanny/api-client';
import { BrowserTokenStore } from './token-store';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

let client: NcannyClient | null = null;
let authFailureHandler: (() => void) | null = null;

export const tokenStore: TokenStore = new BrowserTokenStore();

/**
 * One client per browser session, so that the single-flight refresh in
 * HttpClient actually deduplicates across the whole app.
 */
export function getApiClient(): NcannyClient {
  if (!client) {
    client = new NcannyClient({
      baseUrl: API_URL,
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
