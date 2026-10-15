import { z } from 'zod';
import { avatarPresetSchema } from './auth';
import {
  gradeSchema,
  objectIdSchema,
  searchQuerySchema,
  urlSchema,
  visibilitySchema,
} from './common';

const bioSchema = z.string().trim().max(400, 'Keep the bio under 400 characters');

/**
 * Profile updates are partial by design, but an empty body is rejected so that
 * a no-op request cannot masquerade as a successful change in the audit log.
 */
const atLeastOneField = <T extends z.ZodRawShape>(schema: z.ZodObject<T>) =>
  schema.refine((value) => Object.keys(value).length > 0, {
    message: 'Provide at least one field to update',
  });

export const updateScholarProfileSchema = atLeastOneField(
  z
    .object({
      fullName: z.string().trim().min(2).max(80),
      avatarUrl: urlSchema.nullable(),
      avatarPreset: avatarPresetSchema,
      bio: bioSchema,
      grade: gradeSchema,
      section: z.string().trim().max(10),
      subjectIds: z.array(objectIdSchema).min(1).max(20),
      interestedSubjectIds: z.array(objectIdSchema).max(20),
      visibility: visibilitySchema,
    })
    .partial(),
);

export const updatePreceptorProfileSchema = atLeastOneField(
  z
    .object({
      fullName: z.string().trim().min(2).max(80),
      avatarUrl: urlSchema.nullable(),
      avatarPreset: avatarPresetSchema,
      bio: bioSchema,
      preceptorRole: z.string().trim().max(80),
      teachingSubjectIds: z.array(objectIdSchema).min(1).max(20),
      knowledgeAreas: z.array(z.string().trim().min(2).max(60)).max(20),
      yearsOfExperience: z.coerce.number().int().min(0).max(70),
      visibility: visibilitySchema,
    })
    .partial(),
);

export const schoolSearchSchema = searchQuerySchema;

export type UpdateScholarProfileInput = z.infer<typeof updateScholarProfileSchema>;
export type UpdatePreceptorProfileInput = z.infer<typeof updatePreceptorProfileSchema>;
export type SchoolSearchInput = z.infer<typeof schoolSearchSchema>;
