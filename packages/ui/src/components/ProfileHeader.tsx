import type { ReactNode } from 'react';
import { cn } from '../utils/cn';
import { Avatar } from './Avatar';
import { Badge } from './Badge';

export interface ProfileHeaderProps {
  fullName: string;
  /** Permanent public academic identifier, e.g. `NCS-048213`. */
  cannyId: string;
  avatarUrl?: string;
  /** Short descriptor under the name, e.g. "Grade 8 · Section B". */
  subtitle?: string;
  schoolName?: string;
  bio?: string;
  level?: number;
  /** Rendered to the right on desktop: follow, message or edit actions. */
  actions?: ReactNode;
  /** Compact figures such as XP, badges and streak. */
  stats?: ReactNode;
  className?: string;
}

export function ProfileHeader({
  fullName,
  cannyId,
  avatarUrl,
  subtitle,
  schoolName,
  bio,
  level,
  actions,
  stats,
  className,
}: ProfileHeaderProps) {
  return (
    <header className={cn('rounded-lg bg-surface-raised p-5 shadow-level-1 sm:p-6', className)}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
        <Avatar name={fullName} src={avatarUrl} size="lg" />

        <div className="min-w-0 flex-1">
          <h1 className="font-display text-xl font-semibold text-content sm:text-2xl">{fullName}</h1>

          <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-content-muted">
            {/* The Canny ID is the identifier people share, so it is always visible. */}
            <span className="font-mono tracking-wide text-content">{cannyId}</span>
            {subtitle && (
              <>
                <span aria-hidden="true">·</span>
                <span>{subtitle}</span>
              </>
            )}
            {schoolName && (
              <>
                <span aria-hidden="true">·</span>
                <span>{schoolName}</span>
              </>
            )}
          </p>

          {level !== undefined && (
            <div className="mt-2">
              <Badge tone="primary">Level {level}</Badge>
            </div>
          )}

          {bio && <p className="mt-3 max-w-2xl text-sm text-content">{bio}</p>}
        </div>

        {actions && <div className="flex shrink-0 flex-wrap gap-2">{actions}</div>}
      </div>

      {stats && <div className="mt-5 border-t border-border pt-4">{stats}</div>}
    </header>
  );
}
