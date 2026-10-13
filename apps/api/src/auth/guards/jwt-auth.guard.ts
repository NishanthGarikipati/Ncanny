import { Injectable, type CanActivate, type ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ErrorCode } from '@ncanny/types';
import { IS_PUBLIC_KEY } from '../../common/auth/decorators';
import { AppException } from '../../common/errors/app.exception';
import type { NcannyRequest } from '../../common/http/request-context';
import { SessionsService } from '../../identity/sessions.service';
import { TokenService } from '../token.service';

/**
 * Global authentication guard: routes are protected unless marked `@Public()`.
 *
 * Public routes still parse a token when one is present, so endpoints such as a
 * profile page can tailor their response to the viewer without requiring sign-in.
 *
 * The guard also confirms the session is still live, which costs one indexed
 * read per request but makes "sign out everywhere" take effect immediately —
 * necessary when the account may belong to a child.
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly tokenService: TokenService,
    private readonly sessionsService: SessionsService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    const request = context.switchToHttp().getRequest<NcannyRequest>();
    const token = this.extractToken(request);

    if (!token) {
      if (isPublic) {
        return true;
      }
      throw AppException.unauthenticated();
    }

    try {
      const claims = this.tokenService.verifyAccessToken(token);
      const session = await this.sessionsService.findActiveById(claims.sessionId);
      if (!session) {
        throw AppException.unauthenticated(
          'This session has been signed out.',
          ErrorCode.SESSION_REVOKED,
        );
      }
      request.user = claims;
      return true;
    } catch (error) {
      // An invalid token on a public route is ignored rather than fatal: the
      // caller is simply treated as anonymous.
      if (isPublic) {
        return true;
      }
      throw error;
    }
  }

  private extractToken(request: NcannyRequest): string | null {
    const header = request.headers.authorization;
    if (!header) {
      return null;
    }
    const [scheme, value] = header.split(' ');
    return scheme?.toLowerCase() === 'bearer' && value ? value : null;
  }
}
