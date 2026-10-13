import type { ZodError, ZodIssue, ZodType } from 'zod';
import type { FieldError } from '@ncanny/types';

/**
 * Converts a Zod error into the flat field/message pairs used by the API error
 * envelope and by client-side form state, so both render identical messages.
 */
export function toFieldErrors(error: ZodError): FieldError[] {
  return error.issues.map((issue: ZodIssue) => ({
    field: issue.path.length > 0 ? issue.path.join('.') : '_root',
    message: issue.message,
  }));
}

/** Indexes field errors by field name for direct lookup in form components. */
export function toFieldErrorMap(error: ZodError): Record<string, string> {
  const map: Record<string, string> = {};
  for (const fieldError of toFieldErrors(error)) {
    // Keep the first message per field: later issues are usually consequences.
    if (!(fieldError.field in map)) {
      map[fieldError.field] = fieldError.message;
    }
  }
  return map;
}

export type ValidationOutcome<T> =
  | { success: true; data: T }
  | { success: false; errors: FieldError[]; errorMap: Record<string, string> };

/** Parses input without throwing, returning client-ready error shapes on failure. */
export function validate<T>(schema: ZodType<T>, input: unknown): ValidationOutcome<T> {
  const result = schema.safeParse(input);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return {
    success: false,
    errors: toFieldErrors(result.error),
    errorMap: toFieldErrorMap(result.error),
  };
}
