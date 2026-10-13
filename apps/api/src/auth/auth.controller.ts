import { Body, Controller, Get, HttpCode, HttpStatus, Post, Req } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type {
  AuthSession,
  AuthTokens,
  CurrentUser,
  OtpRequestResult,
  SessionSummary,
  AccessTokenClaims,
} from '@ncanny/types';
import {
  loginSchema,
  otpRequestSchema,
  otpVerifySchema,
  refreshTokenSchema,
  registerPreceptorSchema,
  registerScholarSchema,
  type LoginInput,
  type OtpRequestInput,
  type OtpVerifyInput,
  type RefreshTokenInput,
  type RegisterPreceptorInput,
  type RegisterScholarInput,
} from '@ncanny/validation';
import { CurrentUser as AuthenticatedUser, Public } from '../common/auth/decorators';
import { getClientIp, getUserAgent, type NcannyRequest } from '../common/http/request-context';
import { ApiErrorResponse, ApiZodBody } from '../common/swagger/zod-openapi';
import { zodBody } from '../common/validation/zod-validation.pipe';
import { AuthService, type RequestContext } from './auth.service';

/** Tighter limits than the global default: these endpoints are the brute-force surface. */
const AUTH_THROTTLE = { default: { limit: 10, ttl: 60_000 } };
const OTP_THROTTLE = { default: { limit: 5, ttl: 60_000 } };

function contextOf(request: NcannyRequest): RequestContext {
  return {
    requestId: request.requestId,
    ipAddress: getClientIp(request),
    userAgent: getUserAgent(request),
  };
}

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Throttle(AUTH_THROTTLE)
  @Post('register/scholar')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Register a Scholar',
    description:
      'Creates the account, issues a Canny ID, initialises the Scholar profile and returns a signed-in session.',
  })
  @ApiZodBody(registerScholarSchema)
  @ApiErrorResponse(400, 'VALIDATION_ERROR', 'One or more fields are invalid')
  @ApiErrorResponse(409, 'EMAIL_ALREADY_REGISTERED', 'The email or phone is already registered')
  async registerScholar(
    @Body(zodBody(registerScholarSchema)) input: RegisterScholarInput,
    @Req() request: NcannyRequest,
  ): Promise<AuthSession> {
    return this.authService.registerScholar(input, contextOf(request));
  }

  @Public()
  @Throttle(AUTH_THROTTLE)
  @Post('register/preceptor')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Register a Preceptor' })
  @ApiZodBody(registerPreceptorSchema)
  @ApiErrorResponse(400, 'VALIDATION_ERROR', 'One or more fields are invalid')
  @ApiErrorResponse(409, 'EMAIL_ALREADY_REGISTERED', 'The email or phone is already registered')
  async registerPreceptor(
    @Body(zodBody(registerPreceptorSchema)) input: RegisterPreceptorInput,
    @Req() request: NcannyRequest,
  ): Promise<AuthSession> {
    return this.authService.registerPreceptor(input, contextOf(request));
  }

  @Public()
  @Throttle(AUTH_THROTTLE)
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Sign in with email and password (Attendance)',
    description:
      'Unknown email and incorrect password are reported identically so that accounts cannot be enumerated.',
  })
  @ApiZodBody(loginSchema)
  @ApiErrorResponse(401, 'INVALID_CREDENTIALS', 'The email or password is incorrect')
  async login(
    @Body(zodBody(loginSchema)) input: LoginInput,
    @Req() request: NcannyRequest,
  ): Promise<AuthSession> {
    return this.authService.login(input, contextOf(request));
  }

  @Public()
  @Throttle(OTP_THROTTLE)
  @Post('otp/request')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Request a one-time code',
    description:
      'Always reports success for a well-formed number, whether or not it is registered.',
  })
  @ApiZodBody(otpRequestSchema)
  async requestOtp(
    @Body(zodBody(otpRequestSchema)) input: OtpRequestInput,
    @Req() request: NcannyRequest,
  ): Promise<OtpRequestResult> {
    return this.authService.requestOtp(input.phone, contextOf(request));
  }

  @Public()
  @Throttle(OTP_THROTTLE)
  @Post('otp/verify')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Sign in with a one-time code' })
  @ApiZodBody(otpVerifySchema)
  @ApiErrorResponse(401, 'OTP_INVALID', 'The code is wrong, expired or already used')
  async verifyOtp(
    @Body(zodBody(otpVerifySchema)) input: OtpVerifyInput,
    @Req() request: NcannyRequest,
  ): Promise<AuthSession> {
    return this.authService.verifyOtp(input, contextOf(request));
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Exchange a refresh token for a new token pair',
    description:
      'Refresh tokens rotate on every use. Presenting a superseded token revokes the session.',
  })
  @ApiZodBody(refreshTokenSchema)
  @ApiErrorResponse(401, 'SESSION_REVOKED', 'The session is no longer valid')
  async refresh(
    @Body(zodBody(refreshTokenSchema)) input: RefreshTokenInput,
    @Req() request: NcannyRequest,
  ): Promise<AuthTokens> {
    return this.authService.refresh(input.refreshToken, contextOf(request));
  }

  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get the signed-in account' })
  async me(@AuthenticatedUser() claims: AccessTokenClaims): Promise<CurrentUser> {
    return this.authService.getCurrentUser(claims.sub);
  }

  @Get('sessions')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'List active sessions',
    description: 'Backs the login-activity view in settings.',
  })
  async sessions(@AuthenticatedUser() claims: AccessTokenClaims): Promise<SessionSummary[]> {
    return this.authService.listSessions(claims.sub, claims.sessionId);
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Sign out of the current session' })
  @ApiZodBody(refreshTokenSchema)
  async logout(
    @AuthenticatedUser() claims: AccessTokenClaims,
    @Body(zodBody(refreshTokenSchema)) input: RefreshTokenInput,
    @Req() request: NcannyRequest,
  ): Promise<{ loggedOut: true }> {
    return this.authService.logout(claims.sub, input.refreshToken, contextOf(request));
  }

  @Post('logout-all')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Sign out of every session',
    description: 'Takes effect immediately on all devices.',
  })
  async logoutAll(
    @AuthenticatedUser() claims: AccessTokenClaims,
    @Req() request: NcannyRequest,
  ): Promise<{ revokedSessions: number }> {
    return this.authService.logoutAll(claims.sub, contextOf(request));
  }
}
