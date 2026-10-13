/** Content categories. The generic Content model carries one of these plus type-specific metadata. */
export const ContentType = {
  PAINTING: 'PAINTING',
  ESSAY: 'ESSAY',
  ELOCUTION: 'ELOCUTION',
  STUDY_ACTIVITY: 'STUDY_ACTIVITY',
  TEACHER_VIDEO: 'TEACHER_VIDEO',
  TEACHER_PRESENTATION: 'TEACHER_PRESENTATION',
} as const;

export type ContentType = (typeof ContentType)[keyof typeof ContentType];

/** Content types a Scholar may create. */
export const SCHOLAR_CONTENT_TYPES: readonly ContentType[] = [
  ContentType.PAINTING,
  ContentType.ESSAY,
  ContentType.ELOCUTION,
  ContentType.STUDY_ACTIVITY,
];

/** Content types a Preceptor may create. */
export const PRECEPTOR_CONTENT_TYPES: readonly ContentType[] = [
  ContentType.TEACHER_VIDEO,
  ContentType.TEACHER_PRESENTATION,
];

/**
 * Who may see a resource. Defaults for minors are the most restrictive option
 * that still makes the product work (see docs/SECURITY.md).
 */
export const Visibility = {
  PUBLIC: 'PUBLIC',
  SCHOOL: 'SCHOOL',
  CONNECTIONS: 'CONNECTIONS',
  PRIVATE: 'PRIVATE',
} as const;

export type Visibility = (typeof Visibility)[keyof typeof Visibility];

export const DEFAULT_SCHOLAR_VISIBILITY: Visibility = Visibility.SCHOOL;
export const DEFAULT_PRECEPTOR_VISIBILITY: Visibility = Visibility.SCHOOL;

/** Publication lifecycle of a content item. */
export const ContentStatus = {
  DRAFT: 'DRAFT',
  PUBLISHED: 'PUBLISHED',
  UNDER_REVIEW: 'UNDER_REVIEW',
  ARCHIVED: 'ARCHIVED',
  REMOVED: 'REMOVED',
} as const;

export type ContentStatus = (typeof ContentStatus)[keyof typeof ContentStatus];

/** Moderation state, orthogonal to publication status. */
export const ModerationStatus = {
  NOT_REVIEWED: 'NOT_REVIEWED',
  APPROVED: 'APPROVED',
  FLAGGED: 'FLAGGED',
  REJECTED: 'REJECTED',
} as const;

export type ModerationStatus = (typeof ModerationStatus)[keyof typeof ModerationStatus];

export const MediaKind = {
  IMAGE: 'IMAGE',
  VIDEO: 'VIDEO',
  AUDIO: 'AUDIO',
  DOCUMENT: 'DOCUMENT',
} as const;

export type MediaKind = (typeof MediaKind)[keyof typeof MediaKind];
