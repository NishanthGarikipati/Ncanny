import { z } from 'zod';
import {
  BadgeKey,
  ContentStatus,
  ContentType,
  PRECEPTOR_CONTENT_TYPES,
  ReactionKind,
  SCHOLAR_CONTENT_TYPES,
} from '@ncanny/types';
import { objectIdSchema, paginationSchema, visibilitySchema } from './common';

const titleSchema = z.string().trim().min(3, 'Give the work a title').max(140);
const bodySchema = z.string().trim().min(1).max(20_000);
const summarySchema = z.string().trim().max(280);

const IMAGE_MIME = ['image/png', 'image/jpeg', 'image/webp'] as const;
const AUDIO_MIME = ['audio/webm', 'audio/mpeg', 'audio/wav', 'audio/mp4'] as const;

export const MEDIA_BASE64_MAX = 5_500_000;

export const uploadMediaSchema = z.object({
  mimeType: z.enum([...IMAGE_MIME, ...AUDIO_MIME]),
  dataBase64: z
    .string()
    .min(16, 'The file is empty')
    .max(MEDIA_BASE64_MAX, 'That file is too large'),
});

export const createWorkSchema = z
  .object({
    type: z.enum([
      ContentType.ESSAY,
      ContentType.PAINTING,
      ContentType.ELOCUTION,
      ContentType.STUDY_ACTIVITY,
      ContentType.TEACHER_VIDEO,
      ContentType.TEACHER_PRESENTATION,
    ]),
    title: titleSchema,
    summary: summarySchema.optional(),
    body: bodySchema.optional(),
    subjectId: objectIdSchema,
    visibility: visibilitySchema.optional(),
    mediaId: objectIdSchema.optional(),
    status: z.enum([ContentStatus.DRAFT, ContentStatus.PUBLISHED]).optional(),
  })
  .superRefine((value, ctx) => {
    const needsBody =
      value.type === ContentType.ESSAY ||
      value.type === ContentType.STUDY_ACTIVITY ||
      value.type === ContentType.TEACHER_PRESENTATION;
    if (needsBody && (!value.body || value.body.trim().length < 20)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['body'],
        message: 'Write at least a short paragraph',
      });
    }
    const needsMedia = value.type === ContentType.PAINTING || value.type === ContentType.TEACHER_VIDEO;
    if (needsMedia && !value.mediaId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['mediaId'],
        message: 'Add a file for this kind of work',
      });
    }
    if (value.type === ContentType.ELOCUTION && !value.mediaId && !value.body) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['body'],
        message: 'Add a recording or a transcript',
      });
    }
  });

export const workFeedSchema = paginationSchema.extend({
  type: z
    .enum([
      ContentType.ESSAY,
      ContentType.PAINTING,
      ContentType.ELOCUTION,
      ContentType.STUDY_ACTIVITY,
      ContentType.TEACHER_VIDEO,
      ContentType.TEACHER_PRESENTATION,
    ])
    .optional(),
  subjectId: objectIdSchema.optional(),
});

export const reviewWorkSchema = z.object({
  score: z.coerce.number().int().min(0).max(100),
  feedback: z.string().trim().min(2, 'Write a note the Scholar can act on').max(2_000),
});

export const reportWorkSchema = z.object({
  reason: z.string().trim().min(4, 'Say what is wrong').max(500),
});

export const presenceSchema = z.object({
  optedIn: z.boolean(),
});

export const reactionSchema = z.object({
  kind: z.enum([ReactionKind.LIKE, ReactionKind.SMILE]),
});

export const commentWorkSchema = z.object({
  body: z.string().trim().min(1, 'Write a comment').max(500, 'Keep the comment under 500 characters'),
});

export const awardBadgeSchema = z.object({
  key: z.enum([BadgeKey.SHIELD, BadgeKey.STAR, BadgeKey.MEDAL]),
});

export const SCHOLAR_WORK_TYPES = SCHOLAR_CONTENT_TYPES;
export const PRECEPTOR_WORK_TYPES = PRECEPTOR_CONTENT_TYPES;

export type UploadMediaInput = z.infer<typeof uploadMediaSchema>;
export type CreateWorkInput = z.infer<typeof createWorkSchema>;
export type WorkFeedInput = z.infer<typeof workFeedSchema>;
export type ReviewWorkInput = z.infer<typeof reviewWorkSchema>;
export type ReportWorkInput = z.infer<typeof reportWorkSchema>;
export type PresenceInput = z.infer<typeof presenceSchema>;
export type ReactionInput = z.infer<typeof reactionSchema>;
export type CommentWorkInput = z.infer<typeof commentWorkSchema>;
export type AwardBadgeInput = z.infer<typeof awardBadgeSchema>;
