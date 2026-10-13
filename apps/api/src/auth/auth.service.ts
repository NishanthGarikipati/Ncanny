import { Injectable } from '@nestjs/common';
import { Types } from 'mongoose';
import {
  AnalyticsEvent,
  ErrorCode,
  POST_LOGIN_DESTINATION,
  UserRole,
  type AuthSession,
  type AuthTokens,
  type CurrentUser,
  type SessionSummary,
} from '@ncanny/types';
import type {
  LoginInput,
  OtpVerifyInput,
  RegisterPreceptorInput,
  RegisterScholarInput,
} from '@ncanny/validation';
import { AnalyticsService } from '../common/analytics/analytics.service';
import { AppException } from '../common/errors/app.exception';
import { AuditAction } from '../audit/audit-log.schema';
import { AuditService } from '../audit/audit.service';
import { AppConfigService } from '../config/app-config.service';
import { CannyIdService } from '../identity/canny-id.service';
import { PasswordService } from '../identity/password.service';
import type { UserDocument } from '../identity/schemas/user.schema';
import { SessionsService } from '../identity/sessions.service';
import { UsersService } from '../identity/users.service';
import { ProfilesService } from '../profiles/profiles.service';
import { SchoolsService } from '../schools/schools.service';
import { SubjectsService } from '../subjects/subjects.service';
import { OtpService } from './otp.service';
import { TokenService } from './token.service';

export interface RequestContext {
  requestId?: string;
  ipAddress?: string;
  userAgent?: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly sessionsService: SessionsService,
    private readonly cannyIdService: CannyIdService,
    private readonly passwordService: PasswordService,
    private readonly tokenService: TokenService,
    private readonly otpService: OtpService,
    private readonly schoolsService: SchoolsService,
    private readonly subjectsService: SubjectsService,
    private readonly profilesService: ProfilesService,
    private readonly auditService: AuditService,
    private readonly analytics: AnalyticsService,
    private readonly config: AppConfigService,
  ) {}

  // --------------------------------------------------------- registration

  async registerScholar(
    input: RegisterScholarInput,
    context: RequestContext = {},
  ): Promise<AuthSession> {
    await this.usersService.assertCredentialsAvailable(input.email, input.phone);

    const [subjectIds, interestedSubjectIds] = await Promise.all([
      this.subjectsService.assertAllExist(input.subjectIds, 'subjectIds'),
      this.subjectsService.assertAllExist(input.interestedSubjectIds ?? [], 'interestedSubjectIds'),
    ]);

    const { school, created } = await this.schoolsService.resolveForRegistration(input);
    if (created) {
      await this.auditService.record({
        action: AuditAction.SCHOOL_CREATED,
        resourceType: 'School',
        resourceId: school._id.toString(),
        metadata: { verified: false },
        ...context,
      });
    }

    const cannyId = await this.cannyIdService.issue(UserRole.SCHOLAR);
    const user = await this.usersService.create({
      email: input.email,
      phone: input.phone,
      passwordHash: await this.passwordService.hash(input.password),
      role: UserRole.SCHOLAR,
      cannyId,
      fullName: input.fullName,
      avatarUrl: input.avatarUrl,
      schoolId: school._id,
    });

    await this.profilesService.createScholarProfile({
      userId: user._id,
      cannyId,
      schoolId: school._id,
      grade: input.grade,
      section: input.section,
      subjectIds,
      interestedSubjectIds,
    });

    await this.schoolsService.incrementMemberCount(school._id, UserRole.SCHOLAR);

    return this.completeRegistration(user, context);
  }

  async registerPreceptor(
    input: RegisterPreceptorInput,
    context: RequestContext = {},
  ): Promise<AuthSession> {
    await this.usersService.assertCredentialsAvailable(input.email, input.phone);

    const teachingSubjectIds = await this.subjectsService.assertAllExist(
      input.teachingSubjectIds,
      'teachingSubjectIds',
    );

    const { school, created } = await this.schoolsService.resolveForRegistration(input);
    if (created) {
      await this.auditService.record({
        action: AuditAction.SCHOOL_CREATED,
        resourceType: 'School',
        resourceId: school._id.toString(),
        metadata: { verified: false },
        ...context,
      });
    }

    const cannyId = await this.cannyIdService.issue(UserRole.PRECEPTOR);
    const user = await this.usersService.create({
      email: input.email,
      phone: input.phone,
      passwordHash: await this.passwordService.hash(input.password),
      role: UserRole.PRECEPTOR,
      cannyId,
      fullName: input.fullName,
      avatarUrl: input.avatarUrl,
      schoolId: school._id,
    });

    await this.profilesService.createPreceptorProfile({
      userId: user._id,
      cannyId,
      schoolId: school._id,
      preceptorRole: input.preceptorRole,
      teachingSubjectIds,
      knowledgeAreas: input.knowledgeAreas ?? [],
      yearsOfExperience: input.yearsOfExperience,
    });

    await this.schoolsService.incrementMemberCount(school._id, UserRole.PRECEPTOR);

    return this.completeRegistration(user, context);
  }

  private async completeRegistration(
    user: UserDocument,
    context: RequestContext,
  ): Promise<AuthSession> {
    await this.auditService.record({
      action: AuditAction.USER_REGISTERED,
      actorId: user._id,
      resourceType: 'User',
      resourceId: user._id.toString(),
      metadata: { role: user.role },
      ...context,
    });

    this.analytics.track(
      AnalyticsEvent.REGISTRATION_COMPLETED,
      { role: user.role },
      { userId: user._id.toString(), requestId: context.requestId },
    );

    return this.establishSession(user, context);
  }

  // ------------------------------------------------------------- sign-in

  async login(input: LoginInput, context: RequestContext = {}): Promise<AuthSession> {
    const user = await this.usersService.findByEmailWithPassword(input.email);

    if (!user) {
      // Spend comparable time so that response latency does not reveal whether
      // the email is registered.
      await this.passwordService.burnTimingBudget();
      await this.recordFailedLogin('unknown_email', context);
      throw AppException.unauthenticated(
        'That email address or password is incorrect.',
        ErrorCode.INVALID_CREDENTIALS,
      );
    }

    const passwordValid = await this.passwordService.verify(input.password, user.passwordHash);
    if (!passwordValid) {
      await this.recordFailedLogin('invalid_password', context, user._id);
      throw AppException.unauthenticated(
        'That email address or password is incorrect.',
        ErrorCode.INVALID_CREDENTIALS,
      );
    }

    this.usersService.assertCanAuthenticate(user);

    await this.auditService.record({
      action: AuditAction.LOGIN_SUCCEEDED,
      actorId: user._id,
      metadata: { method: 'password' },
      ...context,
    });

    this.analytics.track(
      AnalyticsEvent.LOGIN_COMPLETED,
      { role: user.role, method: 'password' },
      { userId: user._id.toString(), requestId: context.requestId },
    );

    await this.usersService.recordLogin(user._id);
    return this.establishSession(user, context);
  }

  async requestOtp(phone: string, context: RequestContext = {}) {
    const result = await this.otpService.request(phone);
    await this.auditService.record({
      action: AuditAction.OTP_REQUESTED,
      resourceType: 'Phone',
      ...context,
    });
    return result;
  }

  async verifyOtp(input: OtpVerifyInput, context: RequestContext = {}): Promise<AuthSession> {
    let user: UserDocument;
    try {
      user = await this.otpService.verify(input.phone, input.code);
    } catch (error) {
      await this.auditService.record({
        action: AuditAction.OTP_FAILED,
        success: false,
        reason: error instanceof AppException ? error.code : 'unknown',
        ...context,
      });
      throw error;
    }

    this.usersService.assertCanAuthenticate(user);
    await this.usersService.markPhoneVerified(user);
    await this.usersService.recordLogin(user._id);

    await this.auditService.record({
      action: AuditAction.OTP_VERIFIED,
      actorId: user._id,
      metadata: { method: 'otp' },
      ...context,
    });

    this.analytics.track(
      AnalyticsEvent.LOGIN_COMPLETED,
      { role: user.role, method: 'otp' },
      { userId: user._id.toString(), requestId: context.requestId },
    );

    return this.establishSession(user, context);
  }

  // ------------------------------------------------------------- sessions

  async refresh(refreshToken: string, context: RequestContext = {}): Promise<AuthTokens> {
    const { session, refreshToken: rotated } = await this.sessionsService.rotate(refreshToken, {
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
    });

    const user = await this.usersService.findByIdOrFail(session.userId);
    this.usersService.assertCanAuthenticate(user);

    await this.auditService.record({
      action: AuditAction.TOKEN_REFRESHED,
      actorId: user._id,
      resourceType: 'UserSession',
      resourceId: session._id.toString(),
      ...context,
    });

    return {
      accessToken: this.tokenService.signAccessToken(user, session._id.toString()),
      refreshToken: rotated,
      expiresIn: this.config.accessTokenTtlSeconds,
      tokenType: 'Bearer',
    };
  }

  async logout(
    userId: string,
    refreshToken: string,
    context: RequestContext = {},
  ): Promise<{ loggedOut: true }> {
    await this.sessionsService.revokeByToken(refreshToken);
    await this.auditService.record({
      action: AuditAction.LOGOUT,
      actorId: userId,
      ...context,
    });
    this.analytics.track(
      AnalyticsEvent.LOGOUT_COMPLETED,
      {},
      { userId, requestId: context.requestId },
    );
    return { loggedOut: true };
  }

  async logoutAll(
    userId: string,
    context: RequestContext = {},
  ): Promise<{ revokedSessions: number }> {
    const revokedSessions = await this.sessionsService.revokeAllForUser(new Types.ObjectId(userId));
    await this.auditService.record({
      action: AuditAction.LOGOUT_ALL,
      actorId: userId,
      metadata: { revokedSessions },
      ...context,
    });
    return { revokedSessions };
  }

  async listSessions(userId: string, currentSessionId: string): Promise<SessionSummary[]> {
    return this.sessionsService.listForUser(new Types.ObjectId(userId), currentSessionId);
  }

  async getCurrentUser(userId: string): Promise<CurrentUser> {
    const user = await this.usersService.findByIdOrFail(userId);
    return UsersService.toCurrentUser(user);
  }

  // -------------------------------------------------------------- helpers

  private async establishSession(
    user: UserDocument,
    context: RequestContext,
  ): Promise<AuthSession> {
    const session = await this.sessionsService.issue(user._id, {
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
    });

    return {
      user: UsersService.toCurrentUser(user),
      tokens: {
        accessToken: this.tokenService.signAccessToken(user, session.sessionId),
        refreshToken: session.refreshToken,
        expiresIn: this.config.accessTokenTtlSeconds,
        tokenType: 'Bearer',
      },
      redirectTo: POST_LOGIN_DESTINATION[user.role],
    };
  }

  private async recordFailedLogin(
    reason: string,
    context: RequestContext,
    actorId?: Types.ObjectId,
  ): Promise<void> {
    await this.auditService.record({
      action: AuditAction.LOGIN_FAILED,
      actorId,
      success: false,
      reason,
      ...context,
    });
    this.analytics.track(AnalyticsEvent.LOGIN_FAILED, { reason }, { requestId: context.requestId });
  }
}
