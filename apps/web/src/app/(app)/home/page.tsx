'use client';

import { UserRole } from '@ncanny/types';
import Link from 'next/link';
import { SchoolFeed } from '../../../components/content/SchoolFeed';
import { useAuthStore } from '../../../lib/auth-store';

const MISSIONS = [
  { href: '/create', kicker: 'Create', title: 'Publish a piece', detail: 'Essay, painting, elocution or a study activity for your school.' },
  { href: '/explore', kicker: 'Play', title: 'Walk the campus', detail: 'Open stations, read classmates, and step onto the quad.' },
  { href: '/activity', kicker: 'Earn', title: 'Check your quests', detail: 'See what you published and whether a Preceptor has marked it.' },
];

export default function HomePage() {
  const user = useAuthStore((state) => state.user);
  if (!user) return null;
  const scholar = user.role === UserRole.SCHOLAR;

  return (
    <div className="flex flex-col gap-6">
      <header className="hud-frame p-5 sm:p-6">
        <p className="kicker">Lobby</p>
        <h1 className="mt-1 font-display text-3xl font-semibold text-content">
          Welcome back, {user.fullName.split(' ')[0]}
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-content-muted">
          {scholar ? 'Scholar' : 'Preceptor'} · Canny ID{' '}
          <span className="font-mono text-content">{user.cannyId ?? 'pending'}</span>. Your school’s
          newest work is on the board below. The campus is where you play with it.
        </p>
      </header>

      <ul className="grid gap-3 md:grid-cols-3">
        {MISSIONS.map((mission) => (
          <li key={mission.href}>
            <Link
              href={mission.href}
              className="hud-frame block h-full p-4 hover:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <p className="kicker">{mission.kicker}</p>
              <h2 className="mt-1 font-display text-lg font-semibold text-content">{mission.title}</h2>
              <p className="mt-1 text-sm text-content-muted">{mission.detail}</p>
            </Link>
          </li>
        ))}
      </ul>

      <SchoolFeed isScholar={scholar} profileHref={user.cannyId ? `/profile/${user.cannyId}` : '/profile'} />
    </div>
  );
}
