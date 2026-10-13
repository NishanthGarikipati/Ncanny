import type { AuthTokens } from '@ncanny/types';

/**
 * Storage for authentication tokens. Web uses browser storage, mobile uses
 * expo-secure-store, tests use memory — the client itself stays agnostic.
 */
export interface TokenStore {
  get(): Promise<AuthTokens | null> | AuthTokens | null;
  set(tokens: AuthTokens): Promise<void> | void;
  clear(): Promise<void> | void;
}

export class MemoryTokenStore implements TokenStore {
  private tokens: AuthTokens | null = null;

  get(): AuthTokens | null {
    return this.tokens;
  }

  set(tokens: AuthTokens): void {
    this.tokens = tokens;
  }

  clear(): void {
    this.tokens = null;
  }
}
