import type { AuthTokens } from '@ncanny/types';

/**
 * Rebuilds a token pair from the three values kept in secure storage.
 *
 * They are stored separately because the platform secure store caps a single
 * value (2 KB on iOS), and a combined JSON blob of both tokens can exceed it.
 */
export function assembleTokens(
  accessToken: string | null,
  refreshToken: string | null,
  expiresRaw: string | null,
): AuthTokens | null {
  if (!accessToken || !refreshToken) {
    return null;
  }

  const expiresIn = Number(expiresRaw);
  return {
    accessToken,
    refreshToken,
    expiresIn: Number.isFinite(expiresIn) && expiresIn > 0 ? expiresIn : 0,
    tokenType: 'Bearer',
  };
}
