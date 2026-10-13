import { z } from 'zod';
import {
  ALL_GRADE_LEVELS,
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
  UserRole,
  Visibility,
} from '@ncanny/types';

/** Builds a Zod enum from a readonly list of literal values. */
function literalEnum<T extends string>(values: readonly T[]): z.ZodEnum<[T, ...T[]]> {
  return z.enum(values as unknown as [T, ...T[]]);
}

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(5, 'Enter a valid email address')
  .max(254, 'Email address is too long')
  .email('Enter a valid email address');

/**
 * E.164 phone numbers. Storing a single canonical format avoids ambiguity when
 * the same number is entered with different local prefixes.
 */
export const phoneSchema = z
  .string()
  .trim()
  .regex(
    /^\+[1-9]\d{7,14}$/,
    'Enter the phone number in international format, for example +14155550123',
  );

export const PASSWORD_MIN_LENGTH = 10;

/**
 * Password policy: length does more for safety than exotic character rules, so
 * the length floor is high and the composition requirement is modest.
 */
export const passwordSchema = z
  .string()
  .min(PASSWORD_MIN_LENGTH, `Use at least ${PASSWORD_MIN_LENGTH} characters`)
  .max(128, 'Password is too long')
  .regex(/[a-z]/, 'Include at least one lowercase letter')
  .regex(/[A-Z]/, 'Include at least one uppercase letter')
  .regex(/[0-9]/, 'Include at least one number');

export const objectIdSchema = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid identifier');

export const cannyIdSchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^NC[SP]-\d{6}$/, 'Invalid Canny ID');

export const fullNameSchema = z
  .string()
  .trim()
  .min(2, 'Enter the full name')
  .max(80, 'Name is too long')
  // Letters from any script, plus spaces, apostrophes, hyphens and full stops.
  .regex(/^[\p{L}\p{M}][\p{L}\p{M}\s'.-]*$/u, 'Name contains unsupported characters');

export const urlSchema = z.string().trim().url('Enter a valid URL').max(2048);

export const roleSchema = literalEnum(Object.values(UserRole));
export const selfRegisterableRoleSchema = literalEnum([UserRole.SCHOLAR, UserRole.PRECEPTOR]);
export const gradeSchema = literalEnum(ALL_GRADE_LEVELS);
export const visibilitySchema = literalEnum(Object.values(Visibility));

export const addressSchema = z.object({
  line1: z.string().trim().min(3, 'Enter the street address').max(160),
  line2: z.string().trim().max(160).optional(),
  city: z.string().trim().min(2, 'Enter the city').max(80),
  state: z.string().trim().max(80).optional(),
  postalCode: z.string().trim().max(20).optional(),
  country: z.string().trim().min(2, 'Enter the country').max(80),
});

export const paginationSchema = z.object({
  cursor: z.string().max(256).optional(),
  limit: z.coerce.number().int().min(1).max(MAX_PAGE_SIZE).default(DEFAULT_PAGE_SIZE),
});

export const searchQuerySchema = paginationSchema.extend({
  q: z.string().trim().min(1, 'Enter a search term').max(120).optional(),
});

export type Address = z.infer<typeof addressSchema>;
export type PaginationInput = z.infer<typeof paginationSchema>;
export type SearchQueryInput = z.infer<typeof searchQuerySchema>;
