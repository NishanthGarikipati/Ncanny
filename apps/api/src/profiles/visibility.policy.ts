import { UserRole, Visibility } from '@ncanny/types';

export interface Viewer {
  userId: string;
  role: UserRole;
  schoolId: string | null;
}

export interface VisibilityTarget {
  ownerUserId: string;
  schoolId: string;
  visibility: Visibility;
}

/**
 * Decides whether a viewer may see a resource.
 *
 * Pure and framework-free so the rule is unit-testable in isolation — this is
 * the function that keeps minors' profiles from leaking, so it is tested
 * directly rather than only through HTTP.
 *
 * `CONNECTIONS` is treated as owner-only until the connection graph exists
 * (Epic 7). Erring towards too little visibility is recoverable; erring the
 * other way is not.
 */
export function canViewProfile(target: VisibilityTarget, viewer: Viewer | null): boolean {
  if (viewer && viewer.userId === target.ownerUserId) {
    return true;
  }

  // Platform administrators need cross-school reach for moderation and support.
  if (viewer?.role === UserRole.NCANNY_ADMIN) {
    return true;
  }

  switch (target.visibility) {
    case Visibility.PUBLIC:
      return true;

    case Visibility.SCHOOL:
      return Boolean(viewer?.schoolId && viewer.schoolId === target.schoolId);

    case Visibility.CONNECTIONS:
    case Visibility.PRIVATE:
      return false;

    default:
      // An unknown value must never be interpreted as permissive.
      return false;
  }
}
