import { SetMetadata, createParamDecorator, type ExecutionContext } from '@nestjs/common';
import type { AccessTokenClaims, UserRole } from '@ncanny/types';
import { AppException } from '../errors/app.exception';
import type { NcannyRequest } from '../http/request-context';

export const IS_PUBLIC_KEY = 'ncanny:isPublic';
export const ROLES_KEY = 'ncanny:roles';

/**
 * Marks a route as reachable without authentication. The JWT guard is global,
 * so access is denied by default and opened explicitly — never the reverse.
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

/** Restricts a route to the listed roles. Checked server-side, after authentication. */
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);

/** Injects the authenticated user's token claims. */
export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AccessTokenClaims => {
    const request = context.switchToHttp().getRequest<NcannyRequest>();
    if (!request.user) {
      throw AppException.unauthenticated();
    }
    return request.user;
  },
);

/** Injects the token claims if present, without requiring authentication. */
export const OptionalUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AccessTokenClaims | undefined =>
    context.switchToHttp().getRequest<NcannyRequest>().user,
);
