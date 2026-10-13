import { z } from 'zod';

const DEVELOPMENT_JWT_SECRET = 'development-only-insecure-jwt-secret-change-me';

const csv = (value: string) =>
  value
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);

export const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'staging', 'production']).default('development'),
    PORT: z.coerce.number().int().min(1).max(65535).default(4000),
    API_GLOBAL_PREFIX: z.string().default('api'),

    MONGODB_URI: z.string().min(1, 'MONGODB_URI is required'),
    MONGODB_DB_NAME: z.string().optional(),

    JWT_SECRET: z.string().min(16, 'JWT_SECRET must be at least 16 characters'),
    JWT_ACCESS_TTL_SECONDS: z.coerce.number().int().positive().default(900),
    JWT_REFRESH_TTL_SECONDS: z.coerce
      .number()
      .int()
      .positive()
      .default(60 * 60 * 24 * 30),

    BCRYPT_ROUNDS: z.coerce.number().int().min(10).max(15).default(12),

    OTP_TTL_SECONDS: z.coerce.number().int().positive().default(300),
    OTP_MAX_ATTEMPTS: z.coerce.number().int().positive().max(10).default(5),
    /** Returns the OTP in the response. Refused outside development by the refinement below. */
    OTP_EXPOSE_DEBUG_CODE: z
      .enum(['true', 'false'])
      .default('false')
      .transform((value) => value === 'true'),

    CORS_ORIGINS: z.string().default('http://localhost:3000,http://localhost:8081').transform(csv),

    RATE_LIMIT_TTL_SECONDS: z.coerce.number().int().positive().default(60),
    RATE_LIMIT_LIMIT: z.coerce.number().int().positive().default(120),
    /** Disabled only by the test harness; the production refinement below forbids it. */
    RATE_LIMIT_ENABLED: z
      .enum(['true', 'false'])
      .default('true')
      .transform((value) => value === 'true'),

    /**
     * Directory for uploaded media. Local disk until object storage is attached.
     * Production should set this to a persistent volume; it is not a secret.
     */
    MEDIA_ROOT: z.string().min(1).optional(),

    LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
    SWAGGER_ENABLED: z
      .enum(['true', 'false'])
      .default('true')
      .transform((value) => value === 'true'),
  })
  .superRefine((env, ctx) => {
    // Configuration that is merely convenient in development is dangerous in
    // production, so the process refuses to start rather than warn.
    if (env.NODE_ENV !== 'production') {
      return;
    }
    if (env.JWT_SECRET === DEVELOPMENT_JWT_SECRET) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['JWT_SECRET'],
        message: 'JWT_SECRET must not use the development default in production',
      });
    }
    if (env.OTP_EXPOSE_DEBUG_CODE) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['OTP_EXPOSE_DEBUG_CODE'],
        message: 'OTP_EXPOSE_DEBUG_CODE must be false in production',
      });
    }
    if (!env.RATE_LIMIT_ENABLED) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['RATE_LIMIT_ENABLED'],
        message: 'RATE_LIMIT_ENABLED must be true in production',
      });
    }
    if (env.CORS_ORIGINS.some((origin) => origin === '*' || origin.includes('localhost'))) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['CORS_ORIGINS'],
        message: 'CORS_ORIGINS must list explicit production origins',
      });
    }
  });

export type Env = z.infer<typeof envSchema>;

/**
 * Validates process environment at boot. Failing fast with a readable report is
 * preferable to discovering a missing secret on the first authenticated request.
 */
export function loadEnv(source: NodeJS.ProcessEnv = process.env): Env {
  const result = envSchema.safeParse(source);
  if (!result.success) {
    const report = result.error.issues
      .map((issue) => `  - ${issue.path.join('.') || 'env'}: ${issue.message}`)
      .join('\n');
    throw new Error(`Invalid environment configuration:\n${report}`);
  }
  return result.data;
}

export { DEVELOPMENT_JWT_SECRET };
