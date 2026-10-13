import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '../utils/cn';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  /** `hud` adds the accent framing from the Ncanny visual language. Use sparingly. */
  tone?: 'plain' | 'raised' | 'hud';
  padded?: boolean;
}

const TONE_CLASSES = {
  plain: 'bg-surface border border-border',
  raised: 'bg-surface-raised border border-border shadow-level-1',
  hud: 'bg-surface-raised border border-primary/40 shadow-level-2',
};

export function Card({ tone = 'raised', padded = true, className, children, ...props }: CardProps) {
  return (
    <div
      className={cn('rounded-lg', TONE_CLASSES[tone], padded && 'p-4 sm:p-5', className)}
      {...props}
    >
      {children}
    </div>
  );
}

export interface CardHeaderProps {
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}

export function CardHeader({ title, description, action, className }: CardHeaderProps) {
  return (
    <div className={cn('mb-4 flex items-start justify-between gap-3', className)}>
      <div>
        <h2 className="font-display text-base font-semibold text-content">{title}</h2>
        {description && <p className="mt-0.5 text-sm text-content-muted">{description}</p>}
      </div>
      {action}
    </div>
  );
}
