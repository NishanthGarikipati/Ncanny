'use client';

import { AppShell, Avatar, Button, LoadingState, type NavItem } from '@ncanny/ui';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, type ReactNode } from 'react';
import { useAuthStore } from '../lib/auth-store';
import { ThemeToggle } from './ThemeToggle';

const NAV_ITEMS: NavItem[] = [
  { id: 'home', label: 'Home', href: '/home', icon: '◎' },
  { id: 'explore', label: 'Explore', href: '/explore', icon: '◇' },
  { id: 'activity', label: 'Activity', href: '/activity', icon: '◈' },
  { id: 'profile', label: 'Profile', href: '/profile', icon: '◉' },
];

/**
 * Frame for every signed-in route. Routing is guarded here as a convenience for
 * the user; every protected resource is independently authorised by the API.
 */
export function AuthenticatedShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const status = useAuthStore((state) => state.status);
  const user = useAuthStore((state) => state.user);
  const signOut = useAuthStore((state) => state.signOut);

  useEffect(() => {
    if (status === 'anonymous') {
      router.replace('/attendance');
    }
  }, [status, router]);

  if (status !== 'authenticated' || !user) {
    return <LoadingState label="Checking your attendance" />;
  }

  const activeId = NAV_ITEMS.find((item) => pathname.startsWith(item.href))?.id ?? 'home';

  return (
    <AppShell
      items={NAV_ITEMS}
      activeId={activeId}
      onCreate={() => router.push('/create')}
      brand={
        <Link
          href="/home"
          className="font-display text-xl font-semibold tracking-tight text-content focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          Ncanny
        </Link>
      }
      renderLink={({ href, children: linkChildren, ...rest }) => (
        <Link href={href} {...rest}>
          {linkChildren}
        </Link>
      )}
      sideFooter={
        <div className="flex flex-col gap-2">
          <Link
            href={user.cannyId ? `/profile/${user.cannyId}` : '/profile'}
            className="flex items-center gap-3 rounded-md px-2 py-2 hover:bg-surface-sunken focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <Avatar name={user.fullName} src={user.avatarUrl} size="sm" />
            <span className="min-w-0">
              <span className="block truncate text-sm font-medium text-content">
                {user.fullName}
              </span>
              <span className="block text-xs text-content-muted">{user.cannyId ?? user.role}</span>
            </span>
          </Link>
          <Link
            href="/settings"
            className="rounded-md px-2 py-2 text-sm text-content-muted hover:bg-surface-sunken hover:text-content focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            Settings
          </Link>
          <ThemeToggle />
          <Button variant="ghost" size="sm" onClick={() => void signOut()}>
            Sign out
          </Button>
        </div>
      }
    >
      {children}
    </AppShell>
  );
}
