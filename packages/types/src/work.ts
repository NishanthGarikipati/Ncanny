import type { ContentStatus, ContentType, MediaKind, ModerationStatus, Visibility } from './content';
import type { UserRole } from './roles';

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
  createdAt: string;
}

export interface WorkDetail extends WorkCard {
  body?: string;
  /** True only for the author, so the client can offer edit and delete. */
  ownedByViewer: boolean;
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
