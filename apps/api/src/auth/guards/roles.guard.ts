import { Injectable, type CanActivate, type ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ErrorCode, type UserRole } from '@ncanny/types';
import { ROLES_KEY } from '../../common/auth/decorators';
import { AppException } from '../../common/errors/app.exception';
import type { NcannyRequest } from '../../common/http/request-context';

/** Enforces `@Roles(...)`. Runs after authentication, so claims are trustworthy. */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<UserRole[] | undefined>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!required || required.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<NcannyRequest>();
    if (!request.user) {
      throw AppException.unauthenticated();
    }

    if (!required.includes(request.user.role)) {
      throw AppException.forbidden(
        'Your account type does not have access to this action.',
        ErrorCode.INSUFFICIENT_ROLE,
      );
    }

    return true;
  }
}
