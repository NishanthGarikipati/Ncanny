'use client';

import { UserRole, type ProgressionStats } from '@ncanny/types';
import { Avatar, Button, LoadingState } from '@ncanny/ui';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState, type ReactNode } from 'react';
import { getApiClient } from '../lib/api';
import { useAuthStore } from '../lib/auth-store';
import { ThemeToggle } from './ThemeToggle';

const NAV = [
  { id: 'home', label: 'Lobby', href: '/home' },
  { id: 'explore', label: 'Campus', href: '/explore' },
  { id: 'create', label: 'Create', href: '/create' },
  { id: 'activity', label: 'Quests', href: '/activity' },
  { id: 'school', label: 'School', href: '/school' },
  { id: 'profile', label: 'Character', href: '/profile' },
] as const;

/**
 * Game HUD for every signed-in route. The rail is a convenience; the API still
 * authorises every request.
 */
export function AuthenticatedShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const status = useAuthStore((state) => state.status);
  const user = useAuthStore((state) => state.user);
  const signOut = useAuthStore((state) => state.signOut);
  const [progress, setProgress] = useState<ProgressionStats | null>(null);

  useEffect(() => {
    if (status === 'anonymous') {
      router.replace('/attendance');
    }
  }, [status, router]);

  useEffect(() => {
    if (!user) return undefined;
    const controller = new AbortController();
    const load =
      user.role === UserRole.SCHOLAR
        ? getApiClient().scholars.me({ signal: controller.signal })
        : getApiClient().preceptors.me({ signal: controller.signal });
    load.then((profile) => setProgress(profile.progression)).catch(() => setProgress(null));
    return () => controller.abort();
  }, [user]);

  if (status !== 'authenticated' || !user) {
    return <LoadingState label="Checking your attendance" />;
  }

  const activeId = NAV.find((item) => pathname.startsWith(item.href))?.id ?? 'home';
  const level = progress?.level ?? 1;
  const xp = progress?.xp ?? 0;
  const xpWidth = xpFill(xp);

  return (
    <div className="min-h-screen pb-24 lg:pb-8">
      <header className="sticky top-0 z-20 border-b-2 border-primary/50 bg-surface/90 shadow-hud backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-3">
          <Link href="/home" className="flex items-center gap-2 font-display text-xl font-semibold tracking-tight text-content">
            <span aria-hidden="true" className="grid h-8 w-8 place-items-center rounded-lg border border-primary/50 bg-primary-soft text-sm text-primary">
              N
            </span>
            Ncanny
          </Link>
          <p className="kicker hidden sm:block">Academic campus</p>
          <div className="ml-auto flex items-center gap-3">
            <div className="hidden items-center gap-2 sm:flex">
              <span className="grid h-10 w-10 place-items-center rounded-xl border border-primary bg-primary-soft font-display text-sm font-bold text-primary">
                {level}
              </span>
              <div className="min-w-32">
                <div className="flex items-center justify-between text-xs text-content-muted">
                  <span>Level {level}</span>
                  <span>{xp} XP</span>
                </div>
                <div
                  className="mt-1 h-2 overflow-hidden rounded-full bg-surface-sunken"
                  role="meter"
                  aria-label="Experience"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={xpWidth}
                >
                  <div className="h-full rounded-full bg-primary" style={{ width: `${xpWidth}%` }} />
                </div>
              </div>
            </div>
            <span className="hidden rounded-full border border-primary/40 bg-primary-soft px-2 py-1 font-mono text-xs text-primary md:inline">
              {user.cannyId ?? 'ID pending'}
            </span>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <div className="mx-auto flex max-w-6xl gap-6 px-4 py-6">
        <nav aria-label="Primary" className="sticky top-20 hidden h-fit w-56 shrink-0 flex-col gap-1 lg:flex">
          {NAV.map((item) => (
            <Link
              key={item.id}
              href={item.href}
              aria-current={item.id === activeId ? 'page' : undefined}
              className={`flex h-12 items-center gap-3 rounded-xl border px-3 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                item.id === activeId
                  ? 'border-primary/50 bg-primary-soft text-primary shadow-hud'
                  : 'border-transparent text-content-muted hover:border-border hover:bg-surface-raised hover:text-content'
              }`}
            >
              <NavMark id={item.id} />
              {item.label}
            </Link>
          ))}
          <div className="hud-frame mt-4 p-3">
            <Link href={user.cannyId ? `/profile/${user.cannyId}` : '/profile'} className="flex items-center gap-2">
              <Avatar name={user.fullName} src={user.avatarUrl} size="sm" />
              <span className="min-w-0">
                <span className="block truncate text-sm font-medium text-content">{user.fullName}</span>
                <span className="block text-xs text-content-muted">{user.role === UserRole.SCHOLAR ? 'Scholar' : 'Preceptor'}</span>
              </span>
            </Link>
            <Link href="/settings" className="mt-3 block text-sm text-content-muted hover:text-content">
              Settings
            </Link>
            <Button variant="ghost" size="sm" className="mt-1" onClick={() => void signOut()}>
              Sign out
            </Button>
          </div>
        </nav>

        <main className="min-w-0 flex-1">{children}</main>
      </div>

      <nav
        aria-label="Primary"
        className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-surface/95 px-2 py-2 backdrop-blur lg:hidden"
      >
        <ul className="mx-auto flex max-w-lg items-stretch justify-between">
          {NAV.map((item) => (
            <li key={item.id} className="flex-1">
              <Link
                href={item.href}
                aria-current={item.id === activeId ? 'page' : undefined}
                className={`flex min-h-11 flex-col items-center justify-center gap-0.5 rounded-lg text-[11px] font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                  item.id === activeId ? 'text-primary' : 'text-content-muted'
                }`}
              >
                <NavMark id={item.id} />
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}

function xpFill(xp: number): number {
  if (xp <= 0) return 0;
  return Math.min(100, xp % 100 || 100);
}

function NavMark({ id }: { id: string }) {
  const paths: Record<string, ReactNode> = {
    home: <path d="M4 11.5 12 5l8 6.5V20H4zM9 20v-6h6v6" />,
    explore: <path d="M12 21s7-6.2 7-11a7 7 0 1 0-14 0c0 4.8 7 11 7 11zM12 10.5h.01" />,
    create: <path d="M12 5v14M5 12h14" />,
    activity: <path d="M5 19V9M12 19V5M19 19v-7" />,
    school: <path d="M4 20V9l8-5 8 5v11M9 20v-6h6v6" />,
    profile: <path d="M12 12a3.5 3.5 0 1 0-3.5-3.5A3.5 3.5 0 0 0 12 12zm-6 8a6 6 0 0 1 12 0" />,
  };
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8">
      {paths[id]}
    </svg>
  );
}
