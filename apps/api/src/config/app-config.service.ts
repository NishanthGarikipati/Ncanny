import { Injectable } from '@nestjs/common';
import { loadEnv, type Env } from './env.schema';

/** Typed access to validated configuration. Nothing in the app reads process.env directly. */
@Injectable()
export class AppConfigService {
  private readonly env: Env;

  constructor(env?: Env) {
    this.env = env ?? loadEnv();
  }

  get nodeEnv(): Env['NODE_ENV'] {
    return this.env.NODE_ENV;
  }

  get isProduction(): boolean {
    return this.env.NODE_ENV === 'production';
  }

  get isTest(): boolean {
    return this.env.NODE_ENV === 'test';
  }

  get port(): number {
    return this.env.PORT;
  }

  get globalPrefix(): string {
    return this.env.API_GLOBAL_PREFIX;
  }

  get mongoUri(): string {
    return this.env.MONGODB_URI;
  }

  get mongoDbName(): string | undefined {
    return this.env.MONGODB_DB_NAME;
  }

  get jwtSecret(): string {
    return this.env.JWT_SECRET;
  }

  get accessTokenTtlSeconds(): number {
    return this.env.JWT_ACCESS_TTL_SECONDS;
  }

  get refreshTokenTtlSeconds(): number {
    return this.env.JWT_REFRESH_TTL_SECONDS;
  }

  get bcryptRounds(): number {
    return this.env.BCRYPT_ROUNDS;
  }

  get otpTtlSeconds(): number {
    return this.env.OTP_TTL_SECONDS;
  }

  get otpMaxAttempts(): number {
    return this.env.OTP_MAX_ATTEMPTS;
  }

  get exposeOtpDebugCode(): boolean {
    return this.env.OTP_EXPOSE_DEBUG_CODE && !this.isProduction;
  }

  get corsOrigins(): string[] {
    return this.env.CORS_ORIGINS;
  }

  get rateLimitTtlSeconds(): number {
    return this.env.RATE_LIMIT_TTL_SECONDS;
  }

  get rateLimitLimit(): number {
    return this.env.RATE_LIMIT_LIMIT;
  }

  get rateLimitEnabled(): boolean {
    return this.env.RATE_LIMIT_ENABLED;
  }

  get mediaRoot(): string | undefined {
    return this.env.MEDIA_ROOT;
  }

  get logLevel(): Env['LOG_LEVEL'] {
    return this.env.LOG_LEVEL;
  }

  get swaggerEnabled(): boolean {
    return this.env.SWAGGER_ENABLED && !this.isProduction;
  }
}
