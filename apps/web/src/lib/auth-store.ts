'use client';

import { ApiError } from '@ncanny/api-client';
import type { AuthSession, CurrentUser } from '@ncanny/types';
import { create } from 'zustand';
import { getApiClient, onAuthFailure, tokenStore } from './api';

export type AuthStatus = 'unknown' | 'authenticated' | 'anonymous';

interface AuthState {
  status: AuthStatus;
  user: CurrentUser | null;
  /** Restores the session from stored tokens; safe to call repeatedly. */
  hydrate: () => Promise<void>;
  adoptSession: (session: AuthSession) => void;
  signOut: () => Promise<void>;
  setUser: (user: CurrentUser) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  status: 'unknown',
  user: null,

  hydrate: async () => {
    const stored = await tokenStore.get();
    if (!stored) {
      set({ status: 'anonymous', user: null });
      return;
    }

    try {
      const user = await getApiClient().auth.me();
      set({ status: 'authenticated', user });
    } catch (error) {
      // Only a rejected session clears tokens. A network blip or a server
      // outage leaves them in place so the session survives a reload.
      if (error instanceof ApiError && error.status >= 400 && error.status < 500) {
        await tokenStore.clear();
      }
      set({ status: 'anonymous', user: null });
    }
  },

  adoptSession: (session) => {
    void tokenStore.set(session.tokens);
    set({ status: 'authenticated', user: session.user });
  },

  setUser: (user) => set({ user }),

  signOut: async () => {
    const stored = await tokenStore.get();
    if (stored?.refreshToken) {
      // Best effort: the local session ends regardless of the server's answer.
      await getApiClient()
        .auth.logout(stored.refreshToken)
        .catch(() => undefined);
    }
    await tokenStore.clear();
    set({ status: 'anonymous', user: null });
  },
}));

onAuthFailure(() => {
  void tokenStore.clear();
  useAuthStore.setState({ status: 'anonymous', user: null });
});
