import type { TokenStore } from '@ncanny/api-client';
import type { AuthTokens } from '@ncanny/types';

const STORAGE_KEY = 'ncanny.tokens.v1';

/**
 * Browser token storage.
 *
 * DL-0012: the MVP keeps tokens in localStorage so that web and mobile share
 * one auth flow. This is XSS-exposed and is scheduled to move to httpOnly
 * refresh cookies before beta; see docs/SECURITY.md.
 */
export class BrowserTokenStore implements TokenStore {
  get(): AuthTokens | null {
    if (typeof window === 'undefined') {
      return null;
    }
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as Partial<AuthTokens>;
      if (typeof parsed.accessToken !== 'string' || typeof parsed.refreshToken !== 'string') {
        return null;
      }
      return parsed as AuthTokens;
    } catch {
      return null;
    }
  }

  set(tokens: AuthTokens): void {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(tokens));
  }

  clear(): void {
    if (typeof window === 'undefined') return;
    window.localStorage.removeItem(STORAGE_KEY);
  }
}
