import { z } from 'zod';
import {
  addressSchema,
  cannyIdSchema,
  emailSchema,
  fullNameSchema,
  gradeSchema,
  objectIdSchema,
  passwordSchema,
  phoneSchema,
  urlSchema,
} from './common';

/**
 * A school is identified either by an existing id or by name + address, which
 * provisions an unverified school record (see DL-0011).
 */
export const schoolSelectionSchema = z
  .object({
    schoolId: objectIdSchema.optional(),
    schoolName: z.string().trim().min(2, 'Enter the school name').max(140).optional(),
    schoolAddress: addressSchema.optional(),
  })
  .refine((value) => Boolean(value.schoolId) || Boolean(value.schoolName && value.schoolAddress), {
    message: 'Select a school, or provide the school name and address',
    path: ['schoolName'],
  });

const credentialsShape = {
  email: emailSchema,
  phone: phoneSchema,
  password: passwordSchema,
  confirmPassword: z.string(),
};

const passwordsMatch = <T extends { password: string; confirmPassword: string }>(
  schema: z.ZodType<T>,
) =>
  schema.refine((value) => value.password === value.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

const subjectIdList = (min: number, message: string) =>
  z.array(objectIdSchema).min(min, message).max(20, 'Select no more than 20 subjects');

export const registerScholarSchema = passwordsMatch(
  z
    .object({
      fullName: fullNameSchema,
      avatarUrl: urlSchema.optional(),
      grade: gradeSchema,
      section: z.string().trim().max(10).optional(),
      subjectIds: subjectIdList(1, 'Select at least one subject you are studying'),
      interestedSubjectIds: z.array(objectIdSchema).max(20).default([]),
      ...credentialsShape,
    })
    .and(schoolSelectionSchema),
);

export const registerPreceptorSchema = passwordsMatch(
  z
    .object({
      fullName: fullNameSchema,
      avatarUrl: urlSchema.optional(),
      preceptorRole: z.string().trim().max(80).optional(),
      teachingSubjectIds: subjectIdList(1, 'Select at least one subject you teach'),
      knowledgeAreas: z
        .array(z.string().trim().min(2).max(60))
        .max(20, 'Add no more than 20 knowledge areas')
        .default([]),
      yearsOfExperience: z.coerce.number().int().min(0).max(70).optional(),
      ...credentialsShape,
    })
    .and(schoolSelectionSchema),
);

export const loginSchema = z.object({
  email: emailSchema,
  // Deliberately not `passwordSchema`: sign-in must accept any stored password,
  // including ones created under an older policy.
  password: z.string().min(1, 'Enter your password').max(128),
});

export const otpRequestSchema = z.object({
  phone: phoneSchema,
});

export const otpVerifySchema = z.object({
  phone: phoneSchema,
  code: z
    .string()
    .trim()
    .regex(/^\d{6}$/, 'Enter the 6-digit code'),
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(20, 'Invalid refresh token').max(512),
});

export const cannyIdParamSchema = z.object({
  cannyId: cannyIdSchema,
});

export type RegisterScholarInput = z.infer<typeof registerScholarSchema>;
export type RegisterPreceptorInput = z.infer<typeof registerPreceptorSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type OtpRequestInput = z.infer<typeof otpRequestSchema>;
export type OtpVerifyInput = z.infer<typeof otpVerifySchema>;
export type RefreshTokenInput = z.infer<typeof refreshTokenSchema>;
