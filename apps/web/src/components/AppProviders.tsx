'use client';

import { ToastProvider } from '@ncanny/ui';
import { useEffect, type ReactNode } from 'react';
import { useAuthStore } from '../lib/auth-store';

export function AppProviders({ children }: { children: ReactNode }) {
  const hydrate = useAuthStore((state) => state.hydrate);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  return <ToastProvider>{children}</ToastProvider>;
}
