import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { ErrorCode, type SessionSummary } from '@ncanny/types';
import { AppException } from '../common/errors/app.exception';
import { AppConfigService } from '../config/app-config.service';
import { UserSession, type UserSessionDocument } from './schemas/user-session.schema';

export interface SessionMetadata {
  ipAddress?: string;
  userAgent?: string;
}

export interface IssuedSession {
  sessionId: string;
  refreshToken: string;
  expiresAt: Date;
}

export interface RotationOutcome {
  session: UserSessionDocument;
  refreshToken: string;
}

const SECRET_BYTES = 32;

function hashSecret(secret: string): string {
  return createHash('sha256').update(secret).digest('hex');
}

function hashesMatch(left: string, right: string): boolean {
  const a = Buffer.from(left, 'utf8');
  const b = Buffer.from(right, 'utf8');
  return a.length === b.length && timingSafeEqual(a, b);
}

/**
 * Owns refresh-token lifecycle.
 *
 * A refresh token is `<sessionId>.<secret>`: the id makes lookup an indexed
 * point read, and only the secret's hash is persisted. Every use rotates the
 * secret, so presenting a superseded token is evidence of theft and revokes the
 * session rather than silently failing.
 */
@Injectable()
export class SessionsService {
  constructor(
    @InjectModel(UserSession.name) private readonly sessionModel: Model<UserSessionDocument>,
    private readonly config: AppConfigService,
  ) {}

  async issue(userId: Types.ObjectId, metadata: SessionMetadata = {}): Promise<IssuedSession> {
    const secret = randomBytes(SECRET_BYTES).toString('base64url');
    const expiresAt = new Date(Date.now() + this.config.refreshTokenTtlSeconds * 1000);

    const session = await this.sessionModel.create({
      userId,
      refreshTokenHash: hashSecret(secret),
      expiresAt,
      lastUsedAt: new Date(),
      ipAddress: metadata.ipAddress,
      userAgent: metadata.userAgent,
    });

    return {
      sessionId: session._id.toString(),
      refreshToken: `${session._id.toString()}.${secret}`,
      expiresAt,
    };
  }

  /** Verifies a token, rotates its secret and returns the replacement. */
  async rotate(rawToken: string, metadata: SessionMetadata = {}): Promise<RotationOutcome> {
    const session = await this.resolveForRotation(rawToken);

    const secret = randomBytes(SECRET_BYTES).toString('base64url');
    session.refreshTokenHash = hashSecret(secret);
    session.lastUsedAt = new Date();
    session.ipAddress = metadata.ipAddress ?? session.ipAddress;
    session.userAgent = metadata.userAgent ?? session.userAgent;
    await session.save();

    return { session, refreshToken: `${session._id.toString()}.${secret}` };
  }

  private async resolveForRotation(rawToken: string): Promise<UserSessionDocument> {
    const parsed = this.parse(rawToken);
    if (!parsed) {
      throw AppException.unauthenticated('Invalid refresh token.', ErrorCode.TOKEN_INVALID);
    }

    const session = await this.sessionModel.findById(parsed.sessionId).exec();
    if (!session) {
      throw AppException.unauthenticated('Invalid refresh token.', ErrorCode.TOKEN_INVALID);
    }
    if (session.revokedAt) {
      throw AppException.unauthenticated(
        'This session has been signed out.',
        ErrorCode.SESSION_REVOKED,
      );
    }
    if (session.expiresAt.getTime() <= Date.now()) {
      throw AppException.unauthenticated('This session has expired.', ErrorCode.TOKEN_EXPIRED);
    }

    if (!hashesMatch(session.refreshTokenHash, hashSecret(parsed.secret))) {
      // The session id is genuine but the secret is stale: the token was
      // already rotated, which means two parties hold it. Revoke the family.
      await this.revokeById(session._id, 'refresh_token_reuse_detected');
      throw AppException.unauthenticated(
        'This session has been signed out for security reasons.',
        ErrorCode.SESSION_REVOKED,
      );
    }

    return session;
  }

  async findActiveById(sessionId: string): Promise<UserSessionDocument | null> {
    if (!Types.ObjectId.isValid(sessionId)) {
      return null;
    }
    return this.sessionModel
      .findOne({ _id: new Types.ObjectId(sessionId), revokedAt: { $exists: false } })
      .exec();
  }

  async revokeByToken(rawToken: string, reason = 'logout'): Promise<boolean> {
    const parsed = this.parse(rawToken);
    if (!parsed) {
      return false;
    }
    const result = await this.sessionModel
      .updateOne(
        { _id: parsed.sessionId, revokedAt: { $exists: false } },
        { $set: { revokedAt: new Date(), revokedReason: reason } },
      )
      .exec();
    return result.modifiedCount > 0;
  }

  async revokeById(sessionId: Types.ObjectId | string, reason: string): Promise<void> {
    await this.sessionModel
      .updateOne(
        { _id: sessionId, revokedAt: { $exists: false } },
        { $set: { revokedAt: new Date(), revokedReason: reason } },
      )
      .exec();
  }

  async revokeAllForUser(userId: Types.ObjectId, reason = 'logout_all'): Promise<number> {
    const result = await this.sessionModel
      .updateMany(
        { userId, revokedAt: { $exists: false } },
        { $set: { revokedAt: new Date(), revokedReason: reason } },
      )
      .exec();
    return result.modifiedCount;
  }

  async listForUser(userId: Types.ObjectId, currentSessionId?: string): Promise<SessionSummary[]> {
    const sessions = await this.sessionModel
      .find({ userId, revokedAt: { $exists: false }, expiresAt: { $gt: new Date() } })
      .sort({ lastUsedAt: -1 })
      .limit(50)
      .exec();

    return sessions.map((session) => ({
      id: session._id.toString(),
      createdAt: session.createdAt.toISOString(),
      lastUsedAt: session.lastUsedAt.toISOString(),
      expiresAt: session.expiresAt.toISOString(),
      ipAddress: session.ipAddress,
      userAgent: session.userAgent,
      current: session._id.toString() === currentSessionId,
    }));
  }

  private parse(rawToken: string): { sessionId: string; secret: string } | null {
    const separatorIndex = rawToken.indexOf('.');
    if (separatorIndex <= 0) {
      return null;
    }
    const sessionId = rawToken.slice(0, separatorIndex);
    const secret = rawToken.slice(separatorIndex + 1);
    if (!Types.ObjectId.isValid(sessionId) || secret.length < 20) {
      return null;
    }
    return { sessionId, secret };
  }
}
