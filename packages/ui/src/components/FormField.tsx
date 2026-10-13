import { useId, type ReactElement, type ReactNode } from 'react';
import { cn } from '../utils/cn';

export interface FormFieldProps {
  label: string;
  /** Guidance shown before the user makes a mistake, not after. */
  hint?: string;
  error?: string;
  required?: boolean;
  className?: string;
  /** Receives the generated ids so the control is correctly labelled and described. */
  children: (ids: {
    id: string;
    describedBy: string | undefined;
    invalid: boolean;
  }) => ReactElement;
}

/**
 * Wraps a form control with its label, hint and error.
 *
 * The association between control, hint and error is made here so that no
 * individual form can forget it: an unlabelled or undescribed input is the most
 * common accessibility defect in a product with this much form surface.
 */
export function FormField({
  label,
  hint,
  error,
  required,
  className,
  children,
}: FormFieldProps): ReactNode {
  const id = useId();
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined;

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <label htmlFor={id} className="text-sm font-medium text-content">
        {label}
        {required && (
          <span className="ml-1 text-danger" aria-hidden="true">
            *
          </span>
        )}
        {required && <span className="sr-only"> (required)</span>}
      </label>

      {hint && (
        <p id={hintId} className="text-xs text-content-muted">
          {hint}
        </p>
      )}

      {children({ id, describedBy, invalid: Boolean(error) })}

      {error && (
        // `role="alert"` so the message is announced when it appears after a
        // failed submission.
        <p id={errorId} role="alert" className="flex items-center gap-1 text-xs text-danger">
          <span aria-hidden="true">!</span>
          {error}
        </p>
      )}
    </div>
  );
}
