import { cn } from '../utils/cn';

export interface AvatarProps {
  name: string;
  src?: string | null;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const SIZES = {
  sm: 'h-8 w-8 text-xs',
  md: 'h-11 w-11 text-sm',
  lg: 'h-16 w-16 text-lg',
  xl: 'h-24 w-24 text-2xl',
};

/** Up to two initials; falls back to a neutral mark when a name is unavailable. */
export function initialsOf(name: string): string {
  const parts = name
    .trim()
    .split(/\s+/)
    .filter((part) => part.length > 0);

  if (parts.length === 0) {
    return '?';
  }
  if (parts.length === 1) {
    return (parts[0]?.[0] ?? '').toUpperCase();
  }
  return `${parts[0]?.[0] ?? ''}${parts[parts.length - 1]?.[0] ?? ''}`.toUpperCase();
}

export function Avatar({ name, src, size = 'md', className }: AvatarProps) {
  const shared = cn(
    'inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full',
    SIZES[size],
    className,
  );

  if (src) {
    return <img src={src} alt={`${name}'s avatar`} className={cn(shared, 'object-cover')} />;
  }

  return (
    <span
      className={cn(shared, 'bg-primary-soft font-semibold text-primary')}
      // The initials are decorative: the name is always rendered alongside.
      aria-hidden="true"
    >
      {initialsOf(name)}
    </span>
  );
}
