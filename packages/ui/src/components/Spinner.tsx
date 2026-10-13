import { cn } from '../utils/cn';

export interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  /** Announced to screen readers; set to null inside an element that already announces busy state. */
  label?: string | null;
}

const SIZES = { sm: 'h-4 w-4 border-2', md: 'h-6 w-6 border-2', lg: 'h-9 w-9 border-[3px]' };

export function Spinner({ size = 'md', className, label = 'Loading' }: SpinnerProps) {
  return (
    <span
      role={label ? 'status' : undefined}
      aria-label={label ?? undefined}
      className={cn(
        'inline-block animate-spin rounded-full border-current border-r-transparent align-[-0.125em]',
        // Reduced motion replaces the spin with a static indicator rather than
        // removing the affordance entirely.
        'motion-reduce:animate-none motion-reduce:border-r-current motion-reduce:opacity-60',
        SIZES[size],
        className,
      )}
    />
  );
}
