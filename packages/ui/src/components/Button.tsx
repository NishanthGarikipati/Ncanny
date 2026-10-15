import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { cn } from '../utils/cn';
import { Spinner } from './Spinner';

export type ButtonVariant = 'primary' | 'accent' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  fullWidth?: boolean;
  leadingIcon?: ReactNode;
  trailingIcon?: ReactNode;
}

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary: 'bg-primary text-primary-contrast hover:bg-primary-strong',
  accent: 'bg-accent text-accent-contrast hover:opacity-90',
  secondary:
    'bg-surface-raised text-content border border-border hover:border-border-strong hover:bg-surface-sunken',
  ghost: 'bg-transparent text-content hover:bg-surface-sunken',
  danger: 'bg-danger text-white hover:opacity-90',
};

const SIZE_CLASSES: Record<ButtonSize, string> = {
  // Heights meet the 44px touch-target minimum from md upwards; `sm` is only
  // for dense desktop toolbars.
  sm: 'h-9 px-3 text-sm gap-1.5',
  md: 'h-11 px-4 text-sm gap-2',
  lg: 'h-12 px-6 text-base gap-2',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = 'primary',
    size = 'md',
    loading = false,
    fullWidth = false,
    leadingIcon,
    trailingIcon,
    disabled,
    className,
    children,
    type = 'button',
    ...props
  },
  ref,
) {
  const isDisabled = disabled || loading;

  return (
    <button
      ref={ref}
      type={type}
      disabled={isDisabled}
      // Communicates the busy state to assistive technology, which the spinner
      // alone does not.
      aria-busy={loading || undefined}
      className={cn(
        'inline-flex items-center justify-center rounded-full font-semibold',
        'transition-colors duration-base',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface',
        'disabled:cursor-not-allowed disabled:opacity-50',
        'motion-reduce:transition-none',
        VARIANT_CLASSES[variant],
        SIZE_CLASSES[size],
        fullWidth && 'w-full',
        className,
      )}
      {...props}
    >
      {loading ? <Spinner size="sm" /> : leadingIcon}
      {children}
      {!loading && trailingIcon}
    </button>
  );
});
