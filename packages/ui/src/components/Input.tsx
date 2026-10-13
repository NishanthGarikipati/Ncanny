import {
  forwardRef,
  type InputHTMLAttributes,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react';
import { cn } from '../utils/cn';

const CONTROL_CLASSES = cn(
  'w-full rounded-md border bg-surface px-3 text-sm text-content',
  'placeholder:text-content-muted/70',
  'transition-colors duration-base motion-reduce:transition-none',
  'focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary',
  'disabled:cursor-not-allowed disabled:bg-surface-sunken disabled:opacity-60',
);

const stateClasses = (invalid?: boolean) =>
  invalid ? 'border-danger focus:ring-danger focus:border-danger' : 'border-border';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  invalid?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { invalid, className, ...props },
  ref,
) {
  return (
    <input
      ref={ref}
      aria-invalid={invalid || undefined}
      className={cn(CONTROL_CLASSES, 'h-11', stateClasses(invalid), className)}
      {...props}
    />
  );
});

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  invalid?: boolean;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { invalid, className, rows = 4, ...props },
  ref,
) {
  return (
    <textarea
      ref={ref}
      rows={rows}
      aria-invalid={invalid || undefined}
      className={cn(CONTROL_CLASSES, 'py-2.5', stateClasses(invalid), className)}
      {...props}
    />
  );
});

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  invalid?: boolean;
  options: SelectOption[];
  placeholder?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { invalid, options, placeholder, className, ...props },
  ref,
) {
  return (
    <select
      ref={ref}
      aria-invalid={invalid || undefined}
      className={cn(CONTROL_CLASSES, 'h-11', stateClasses(invalid), className)}
      {...props}
    >
      {placeholder && (
        <option value="" disabled>
          {placeholder}
        </option>
      )}
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
});
