import { ApiError } from '@ncanny/api-client';
import { toFieldErrorMap } from '@ncanny/validation';
import type { ZodType } from 'zod';

export type FieldErrors = Record<string, string>;

/** Key used for errors that belong to the form as a whole rather than one field. */
export const FORM_ERROR = '_root';

export function parseForm<T>(
  schema: ZodType<T>,
  input: unknown,
): { ok: true; data: T } | { ok: false; errors: FieldErrors } {
  const result = schema.safeParse(input);
  if (result.success) {
    return { ok: true, data: result.data };
  }
  return { ok: false, errors: toFieldErrorMap(result.error) };
}

/**
 * Turns a failed request into form state. Server-side field errors land on the
 * same keys the client validator uses, so a message renders in the same place
 * whichever side rejected it. Unknown errors are never shown verbatim.
 */
export function toFormErrors(error: unknown): FieldErrors {
  if (error instanceof ApiError) {
    const fieldErrors = error.fieldErrors;
    if (Object.keys(fieldErrors).length > 0) {
      return fieldErrors;
    }
    return { [FORM_ERROR]: error.message };
  }
  return { [FORM_ERROR]: 'Something went wrong. Please try again.' };
}
