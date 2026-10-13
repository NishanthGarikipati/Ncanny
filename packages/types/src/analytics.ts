/**
 * Product analytics events. Names are stable; payloads carry pseudonymous ids
 * only — never content bodies, contact details or free text.
 */
export const AnalyticsEvent = {
  REGISTRATION_COMPLETED: 'registration_completed',
  LOGIN_COMPLETED: 'login_completed',
  LOGIN_FAILED: 'login_failed',
  LOGOUT_COMPLETED: 'logout_completed',
  PROFILE_COMPLETED: 'profile_completed',
  PROFILE_UPDATED: 'profile_updated',
  PROFILE_VIEWED: 'profile_viewed',
  CONTENT_CREATED: 'content_created',
  ESSAY_SUBMITTED: 'essay_submitted',
  PAINTING_UPLOADED: 'painting_uploaded',
  ELOCUTION_UPLOADED: 'elocution_uploaded',
  STUDY_ACTIVITY_UPLOADED: 'study_activity_uploaded',
  CONTENT_VIEWED: 'content_viewed',
  COMMENT_CREATED: 'comment_created',
  CONTENT_LIKED: 'content_liked',
  REVIEW_CREATED: 'review_created',
  BADGE_AWARDED: 'badge_awarded',
  CHALLENGE_JOINED: 'challenge_joined',
  CHALLENGE_COMPLETED: 'challenge_completed',
  SUBJECT_FOLLOWED: 'subject_followed',
  SEARCH_PERFORMED: 'search_performed',
  THREE_D_WORLD_ENTERED: '3d_world_entered',
} as const;

export type AnalyticsEvent = (typeof AnalyticsEvent)[keyof typeof AnalyticsEvent];

export type AnalyticsPropertyValue = string | number | boolean | null;

export interface AnalyticsEventPayload {
  event: AnalyticsEvent;
  /** Pseudonymous actor id, omitted for anonymous events. */
  userId?: string;
  properties?: Record<string, AnalyticsPropertyValue>;
  occurredAt?: string;
}
