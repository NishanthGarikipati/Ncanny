import type { CurrentUser } from './profile';
import type { UserRole } from './roles';

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  /** Seconds until the access token expires. */
  expiresIn: number;
  tokenType: 'Bearer';
}

export interface AuthSession {
  user: CurrentUser;
  tokens: AuthTokens;
  /** Server-decided landing route, so web and mobile route identically. */
  redirectTo: string;
}

/** Claims carried by the access token. Nothing sensitive belongs here. */
export interface AccessTokenClaims {
  sub: string;
  role: UserRole;
  cannyId: string | null;
  schoolId: string | null;
  sessionId: string;
  iat: number;
  exp: number;
}

/** Entry shown on the "login activity" settings screen. */
export interface SessionSummary {
  id: string;
  createdAt: string;
  lastUsedAt: string;
  expiresAt: string;
  ipAddress?: string;
  userAgent?: string;
  current: boolean;
}

export interface OtpRequestResult {
  /**
   * Always true for a well-formed request, whether or not the phone number is
   * registered: responses must not reveal account existence.
   */
  sent: boolean;
  expiresInSeconds: number;
  /** Development convenience only; never populated outside development. */
  debugCode?: string;
}
