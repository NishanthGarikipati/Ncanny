/** Platform roles. Authorisation is always evaluated server-side against these values. */
export const UserRole = {
  /** A school student. Owns a Canny ID and creates academic content. */
  SCHOLAR: 'SCHOLAR',
  /** A teacher or educator. Reviews, marks and mentors Scholars. */
  PRECEPTOR: 'PRECEPTOR',
  /** Administrator of a single school. */
  SCHOOL_ADMIN: 'SCHOOL_ADMIN',
  /** Ncanny platform operator. */
  NCANNY_ADMIN: 'NCANNY_ADMIN',
} as const;

export type UserRole = (typeof UserRole)[keyof typeof UserRole];

export const ALL_USER_ROLES: readonly UserRole[] = Object.values(UserRole);

/** Roles that may self-register through the public registration endpoints. */
export const SELF_REGISTERABLE_ROLES: readonly UserRole[] = [UserRole.SCHOLAR, UserRole.PRECEPTOR];

/** Lifecycle status of an account. Only ACTIVE accounts may authenticate. */
export const UserStatus = {
  PENDING_VERIFICATION: 'PENDING_VERIFICATION',
  ACTIVE: 'ACTIVE',
  SUSPENDED: 'SUSPENDED',
  DEACTIVATED: 'DEACTIVATED',
} as const;

export type UserStatus = (typeof UserStatus)[keyof typeof UserStatus];

/**
 * Where a client should navigate after a successful sign-in. The server decides
 * this so that routing stays consistent across web and mobile.
 */
export const POST_LOGIN_DESTINATION: Record<UserRole, string> = {
  [UserRole.SCHOLAR]: '/home',
  [UserRole.PRECEPTOR]: '/home',
  [UserRole.SCHOOL_ADMIN]: '/school/dashboard',
  [UserRole.NCANNY_ADMIN]: '/admin',
};
