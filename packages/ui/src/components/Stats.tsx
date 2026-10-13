import type { ReactNode } from 'react';
import { cn } from '../utils/cn';

export interface StatCardProps {
  label: string;
  value: ReactNode;
  hint?: string;
  icon?: ReactNode;
  className?: string;
}

export function StatCard({ label, value, hint, icon, className }: StatCardProps) {
  return (
    <div className={cn('rounded-lg border border-border bg-surface p-4', className)}>
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-medium uppercase tracking-wide text-content-muted">{label}</p>
        {icon && (
          <span className="text-content-muted" aria-hidden="true">
            {icon}
          </span>
        )}
      </div>
      <p className="mt-1 font-display text-2xl font-semibold text-content">{value}</p>
      {hint && <p className="mt-0.5 text-xs text-content-muted">{hint}</p>}
    </div>
  );
}

export interface ProgressBarProps {
  value: number;
  max?: number;
  label: string;
  /** Shown beside the label, e.g. "8,420 / 10,000 XP". */
  valueLabel?: string;
  className?: string;
}

export function ProgressBar({ value, max = 100, label, valueLabel, className }: ProgressBarProps) {
  const safeMax = max > 0 ? max : 100;
  const clamped = Math.min(Math.max(value, 0), safeMax);
  const percentage = Math.round((clamped / safeMax) * 100);

  return (
    <div className={className}>
      <div className="mb-1 flex items-baseline justify-between gap-2">
        <span className="text-xs font-medium text-content-muted">{label}</span>
        {valueLabel && <span className="text-xs text-content-muted">{valueLabel}</span>}
      </div>
      <div
        role="progressbar"
        aria-valuenow={clamped}
        aria-valuemin={0}
        aria-valuemax={safeMax}
        aria-label={label}
        className="h-2 w-full overflow-hidden rounded-full bg-surface-sunken"
      >
        <div
          className="h-full rounded-full bg-primary transition-[width] duration-slow motion-reduce:transition-none"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
