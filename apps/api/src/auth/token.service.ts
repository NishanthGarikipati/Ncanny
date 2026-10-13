import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ErrorCode, type AccessTokenClaims } from '@ncanny/types';
import { AppException } from '../common/errors/app.exception';
import { AppConfigService } from '../config/app-config.service';
import type { UserDocument } from '../identity/schemas/user.schema';

/** Issues and verifies access tokens. Claims carry identity only — never secrets. */
@Injectable()
export class TokenService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly config: AppConfigService,
  ) {}

  signAccessToken(user: UserDocument, sessionId: string): string {
    const payload: Omit<AccessTokenClaims, 'iat' | 'exp'> = {
      sub: user._id.toString(),
      role: user.role,
      cannyId: user.cannyId ?? null,
      schoolId: user.schoolId ? user.schoolId.toString() : null,
      sessionId,
    };

    return this.jwtService.sign(payload, {
      secret: this.config.jwtSecret,
      expiresIn: this.config.accessTokenTtlSeconds,
    });
  }

  verifyAccessToken(token: string): AccessTokenClaims {
    try {
      return this.jwtService.verify<AccessTokenClaims>(token, { secret: this.config.jwtSecret });
    } catch (error) {
      const expired = error instanceof Error && error.name === 'TokenExpiredError';
      throw AppException.unauthenticated(
        expired ? 'Your session has expired. Please sign in again.' : 'Invalid access token.',
        expired ? ErrorCode.TOKEN_EXPIRED : ErrorCode.TOKEN_INVALID,
      );
    }
  }
}
