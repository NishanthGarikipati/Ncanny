import type { ReactNode } from 'react';
import { AuthenticatedShell } from '../../components/AuthenticatedShell';

export default function AppLayout({ children }: { children: ReactNode }) {
  return <AuthenticatedShell>{children}</AuthenticatedShell>;
}
