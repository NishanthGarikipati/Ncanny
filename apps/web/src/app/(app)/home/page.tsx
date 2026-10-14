'use client';

import { UserRole } from '@ncanny/types';
import { StatCard } from '@ncanny/ui';
import { SchoolFeed } from '../../../components/content/SchoolFeed';
import { useAuthStore } from '../../../lib/auth-store';

export default function HomePage() {
  const user = useAuthStore((state) => state.user);
  if (!user) return null;

  const isScholar = user.role === UserRole.SCHOLAR;

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <header>
        <h1 className="font-display text-2xl font-semibold text-content">
          Welcome back, {user.fullName.split(' ')[0]}
        </h1>
        <p className="mt-1 text-sm text-content-muted">
          Your attendance is marked for today. Your Canny ID is{' '}
          <span className="font-mono text-content">{user.cannyId ?? 'pending'}</span>.
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Canny ID" value={user.cannyId ?? '—'} />
        <StatCard label="Role" value={isScholar ? 'Scholar' : 'Preceptor'} />
        <StatCard
          label="Phone verified"
          value={user.phoneVerified ? 'Yes' : 'Not yet'}
          hint={user.phoneVerified ? undefined : 'Verify your phone to recover your account.'}
        />
      </div>

      <SchoolFeed isScholar={isScholar} profileHref={user.cannyId ? `/profile/${user.cannyId}` : '/profile'} />
    </div>
  );
}
