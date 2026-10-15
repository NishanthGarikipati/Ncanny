import type { GradeLevel } from './academic';
import type { Visibility } from './content';
import type { UserRole, UserStatus } from './roles';
import type { SchoolSummary } from './school';

/** Geometric marks a person can wear. These are icons, not generated portraits. */
export const AvatarPreset = {
  CREST: 'crest',
  BOOK: 'book',
  QUILL: 'quill',
  LANTERN: 'lantern',
  COMPASS: 'compass',
} as const;

export type AvatarPreset = (typeof AvatarPreset)[keyof typeof AvatarPreset];

export const AVATAR_PRESETS: readonly AvatarPreset[] = Object.values(AvatarPreset);

/** Gamification figures shown on a profile. Populated from Epic 8 onwards. */
export interface ProgressionStats {
  xp: number;
  level: number;
  /** Null until the user has enough activity to be ranked. */
  rank: number | null;
  badgeCount: number;
  streakDays: number;
}

export interface ScholarContentStats {
  paintings: number;
  essays: number;
  elocutions: number;
  studyActivities: number;
  total: number;
}

export interface PreceptorInteractionStats {
  scholarsInteractedWith: number;
  submissionsReviewed: number;
  feedbackProvided: number;
  marksProvided: number;
  badgesAwarded: number;
  contentUploaded: number;
}

/** Fields common to every public profile representation. */
export interface ProfileIdentity {
  userId: string;
  /** Permanent public academic identifier, e.g. `NCS-048213`. */
  cannyId: string;
  role: UserRole;
  fullName: string;
  avatarUrl?: string;
  avatarPreset?: AvatarPreset;
  bio?: string;
  school: SchoolSummary;
  visibility: Visibility;
  createdAt: string;
}

export interface ScholarProfile extends ProfileIdentity {
  role: typeof UserRole.SCHOLAR;
  grade: GradeLevel;
  section?: string;
  /** Subject ids the Scholar is currently studying. */
  subjectIds: string[];
  /** Subject ids the Scholar wants to explore beyond their curriculum. */
  interestedSubjectIds: string[];
  progression: ProgressionStats;
  contentStats: ScholarContentStats;
}

export interface PreceptorProfile extends ProfileIdentity {
  role: typeof UserRole.PRECEPTOR;
  /** Job title within the school, e.g. "Senior Science Preceptor". */
  preceptorRole?: string;
  teachingSubjectIds: string[];
  knowledgeAreas: string[];
  yearsOfExperience?: number;
  progression: ProgressionStats;
  interactionStats: PreceptorInteractionStats;
}

export type AnyProfile = ScholarProfile | PreceptorProfile;

/**
 * The authenticated user's own account view. Unlike a profile, this includes
 * contact details, which are never exposed to other users.
 */
export interface CurrentUser {
  id: string;
  cannyId: string | null;
  role: UserRole;
  status: UserStatus;
  email: string;
  phone?: string;
  fullName: string;
  avatarUrl?: string;
  avatarPreset?: AvatarPreset;
  schoolId: string | null;
  emailVerified: boolean;
  phoneVerified: boolean;
  createdAt: string;
}
