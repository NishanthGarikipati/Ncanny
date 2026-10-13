import type { ReactNode } from 'react';
import { cn } from '../utils/cn';
import { Spinner } from './Spinner';

export type AlertTone = 'info' | 'success' | 'warning' | 'danger';

export interface AlertProps {
  tone?: AlertTone;
  title?: string;
  className?: string;
  children: ReactNode;
}

const ALERT_TONES: Record<AlertTone, string> = {
  info: 'bg-info-soft border-info/30 text-info',
  success: 'bg-success-soft border-success/30 text-success',
  warning: 'bg-warning-soft border-warning/30 text-warning',
  danger: 'bg-danger-soft border-danger/30 text-danger',
};

/** Errors and warnings are announced; informational and success messages are not. */
export function Alert({ tone = 'info', title, className, children }: AlertProps) {
  const assertive = tone === 'danger' || tone === 'warning';

  return (
    <div
      role={assertive ? 'alert' : 'status'}
      className={cn('rounded-md border px-4 py-3 text-sm', ALERT_TONES[tone], className)}
    >
      {title && <p className="font-semibold">{title}</p>}
      <div className={cn(title && 'mt-0.5')}>{children}</div>
    </div>
  );
}

export interface EmptyStateProps {
  title: string;
  /** Says what the surface is for and what to do next, rather than "no data". */
  description: string;
  icon?: ReactNode;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({ title, description, icon, action, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center rounded-lg border border-dashed border-border',
        'px-6 py-12 text-center',
        className,
      )}
    >
      {icon && (
        <div className="mb-3 text-3xl text-content-muted" aria-hidden="true">
          {icon}
        </div>
      )}
      <h3 className="font-display text-base font-semibold text-content">{title}</h3>
      <p className="mt-1 max-w-sm text-sm text-content-muted">{description}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export interface LoadingStateProps {
  label?: string;
  className?: string;
}

export function LoadingState({ label = 'Loading', className }: LoadingStateProps) {
  return (
    <div className={cn('flex items-center justify-center gap-3 py-12 text-content-muted', className)}>
      <Spinner label={null} />
      <span>{label}</span>
    </div>
  );
}

export interface SkeletonProps {
  className?: string;
}

/** Placeholder shaped like the content it replaces, so layout does not shift on load. */
export function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        'animate-pulse rounded-md bg-surface-sunken motion-reduce:animate-none',
        className,
      )}
    />
  );
}
