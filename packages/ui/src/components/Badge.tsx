import type { ReactNode } from 'react';
import { cn } from '../utils/cn';

export type BadgeTone = 'neutral' | 'primary' | 'accent' | 'success' | 'warning' | 'danger' | 'info';

export interface BadgeProps {
  tone?: BadgeTone;
  icon?: ReactNode;
  className?: string;
  children: ReactNode;
}

const TONE_CLASSES: Record<BadgeTone, string> = {
  neutral: 'bg-surface-sunken text-content-muted border-border',
  primary: 'bg-primary-soft text-primary border-primary/30',
  accent: 'bg-accent-soft text-accent border-accent/30',
  success: 'bg-success-soft text-success border-success/30',
  warning: 'bg-warning-soft text-warning border-warning/30',
  danger: 'bg-danger-soft text-danger border-danger/30',
  info: 'bg-info-soft text-info border-info/30',
};

/**
 * Status and achievement chip.
 *
 * Tone is never the only signal: callers pass text, and optionally an icon, so
 * that meaning survives for colour-blind users and in monochrome.
 */
export function Badge({ tone = 'neutral', icon, className, children }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5',
        'text-xs font-medium',
        TONE_CLASSES[tone],
        className,
      )}
    >
      {icon && <span aria-hidden="true">{icon}</span>}
      {children}
    </span>
  );
}

export interface TagProps {
  className?: string;
  children: ReactNode;
  onRemove?: () => void;
  removeLabel?: string;
}

/** Subject or topic chip, optionally removable. */
export function Tag({ className, children, onRemove, removeLabel }: TagProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-md bg-surface-sunken px-2.5 py-1',
        'text-xs font-medium text-content',
        className,
      )}
    >
      {children}
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          aria-label={removeLabel ?? `Remove ${typeof children === 'string' ? children : 'item'}`}
          className="rounded-sm text-content-muted hover:text-danger focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <span aria-hidden="true">×</span>
        </button>
      )}
    </span>
  );
}
