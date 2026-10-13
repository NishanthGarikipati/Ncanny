'use client';

import { UserRole } from '@ncanny/types';
import { Card, CardHeader, EmptyState, StatCard } from '@ncanny/ui';
import Link from 'next/link';
import { useAuthStore } from '../../../lib/auth-store';

/**
 * Home feed shell. The feed itself arrives with content creation (Epic 5); this
 * milestone ships the frame, the greeting and the honest empty state.
 */
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

      <Card>
        <CardHeader
          title="Your feed"
          description="Work from your school, your subjects and the Scholars you follow."
        />
        <div className="mt-4">
          <EmptyState
            title="Nothing to show yet"
            description={
              isScholar
                ? 'Creating and sharing work arrives in the next milestone. Until then, finish your profile so Preceptors can find you.'
                : 'Scholar submissions arrive in the next milestone. Until then, finish your profile so your Scholars can find you.'
            }
            action={
              <Link
                href={user.cannyId ? `/profile/${user.cannyId}` : '/profile'}
                className="inline-flex h-11 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-contrast hover:bg-primary-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
              >
                Go to my profile
              </Link>
            }
          />
        </div>
      </Card>
    </div>
  );
}
