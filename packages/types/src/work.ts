import type { ContentStatus, ContentType, MediaKind, ModerationStatus, Visibility } from './content';
import type { UserRole } from './roles';

/** A reaction a classmate can toggle on work they are allowed to see. */
export const ReactionKind = {
  LIKE: 'like',
  SMILE: 'smile',
} as const;

export type ReactionKind = (typeof ReactionKind)[keyof typeof ReactionKind];

/** Fixed badges a Preceptor can place on someone else's work. */
export const BadgeKey = {
  SHIELD: 'shield',
  STAR: 'star',
  MEDAL: 'medal',
} as const;

export type BadgeKey = (typeof BadgeKey)[keyof typeof BadgeKey];

export const BADGE_KEYS: readonly BadgeKey[] = [BadgeKey.SHIELD, BadgeKey.STAR, BadgeKey.MEDAL];

export interface AwardedBadge {
  key: BadgeKey;
  awardedByName: string;
  awardedByCannyId: string;
  awardedAt: string;
}

/** A short note on a visible school work. Not a direct message. */
export interface WorkComment {
  id: string;
  authorName: string;
  authorCannyId: string;
  authorRole: UserRole;
  body: string;
  createdAt: string;
}

/**
 * Counts are real. The viewer's own like is stored, and it is not a rank signal.
 */
export interface WorkEngagement {
  likeCount: number;
  smileCount: number;
  commentCount: number;
  badges: AwardedBadge[];
  viewerLiked: boolean;
  viewerSmiled: boolean;
  bookmarked: boolean;
}

/** Published work in the viewer's school, grouped for the school page. */
export interface SchoolWorkCounts {
  paintings: number;
  essays: number;
  elocutions: number;
  studyActivities: number;
  faculty: number;
}

/** A mark left by a Preceptor. It is feedback, not an automated grade. */
export interface WorkReview {
  score: number;
  maxScore: number;
  feedback: string;
  reviewerName: string;
  reviewerCannyId: string;
  reviewedAt: string;
}

/**
 * Work as it appears on the feed, the whiteboard and the hall walls.
 * Internal account ids are not included.
 */
export interface WorkCard {
  id: string;
  type: ContentType;
  title: string;
  summary?: string;
  authorName: string;
  authorCannyId: string;
  authorRole: UserRole;
  subjectId: string;
  subjectName: string;
  visibility: Visibility;
  status: ContentStatus;
  moderationStatus: ModerationStatus;
  hasMedia: boolean;
  mediaKind?: MediaKind;
  review?: WorkReview;
  engagement: WorkEngagement;
  createdAt: string;
}

export interface WorkDetail extends WorkCard {
  body?: string;
  /** True only for the author, so the client can offer edit and delete. */
  ownedByViewer: boolean;
  /** Latest comments, oldest first. Capped so a popular work stays readable. */
  comments: WorkComment[];
}

export interface StoredMedia {
  id: string;
  kind: MediaKind;
  mimeType: string;
  byteSize: number;
}

export interface MediaPayload {
  mimeType: string;
  /** Base64, without a data-URL prefix. */
  dataBase64: string;
}

/** People who chose to appear in the hall. Names and Canny IDs only. */
export interface HallPresence {
  cannyId: string;
  fullName: string;
  role: UserRole;
}

export interface AcademicHall {
  works: WorkCard[];
  presence: HallPresence[];
  viewerOptedIn: boolean;
}
