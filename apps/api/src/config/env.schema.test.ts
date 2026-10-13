import { DEVELOPMENT_JWT_SECRET, loadEnv } from './env.schema';

const baseEnv = {
  MONGODB_URI: 'mongodb://localhost:27017/ncanny',
  JWT_SECRET: 'a-sufficiently-long-secret-value',
};

describe('environment validation', () => {
  it('applies documented defaults', () => {
    const env = loadEnv({ ...baseEnv } as NodeJS.ProcessEnv);

    expect(env.NODE_ENV).toBe('development');
    expect(env.PORT).toBe(4000);
    expect(env.JWT_ACCESS_TTL_SECONDS).toBe(900);
    expect(env.BCRYPT_ROUNDS).toBe(12);
    expect(env.RATE_LIMIT_ENABLED).toBe(true);
  });

  it('parses the CORS allow-list into a trimmed array', () => {
    const env = loadEnv({
      ...baseEnv,
      CORS_ORIGINS: 'https://ncanny.app, https://admin.ncanny.app ,',
    } as NodeJS.ProcessEnv);

    expect(env.CORS_ORIGINS).toEqual(['https://ncanny.app', 'https://admin.ncanny.app']);
  });

  it('fails when a required value is missing', () => {
    expect(() => loadEnv({ JWT_SECRET: baseEnv.JWT_SECRET } as NodeJS.ProcessEnv)).toThrow(
      /MONGODB_URI/,
    );
  });

  it('fails when the signing secret is too short to be meaningful', () => {
    expect(() => loadEnv({ ...baseEnv, JWT_SECRET: 'short' } as NodeJS.ProcessEnv)).toThrow(
      /JWT_SECRET/,
    );
  });

  describe('production safeguards', () => {
    const productionEnv = {
      ...baseEnv,
      NODE_ENV: 'production',
      CORS_ORIGINS: 'https://ncanny.app',
    };

    it('accepts a correctly configured production environment', () => {
      expect(() => loadEnv(productionEnv as NodeJS.ProcessEnv)).not.toThrow();
    });

    it('refuses to start with the development signing secret', () => {
      expect(() =>
        loadEnv({ ...productionEnv, JWT_SECRET: DEVELOPMENT_JWT_SECRET } as NodeJS.ProcessEnv),
      ).toThrow(/JWT_SECRET/);
    });

    it('refuses to expose one-time codes in responses', () => {
      expect(() =>
        loadEnv({ ...productionEnv, OTP_EXPOSE_DEBUG_CODE: 'true' } as NodeJS.ProcessEnv),
      ).toThrow(/OTP_EXPOSE_DEBUG_CODE/);
    });

    it('refuses to run with rate limiting disabled', () => {
      expect(() =>
        loadEnv({ ...productionEnv, RATE_LIMIT_ENABLED: 'false' } as NodeJS.ProcessEnv),
      ).toThrow(/RATE_LIMIT_ENABLED/);
    });

    it('refuses a wildcard or localhost CORS allow-list', () => {
      expect(() => loadEnv({ ...productionEnv, CORS_ORIGINS: '*' } as NodeJS.ProcessEnv)).toThrow(
        /CORS_ORIGINS/,
      );
      expect(() =>
        loadEnv({ ...productionEnv, CORS_ORIGINS: 'http://localhost:3000' } as NodeJS.ProcessEnv),
      ).toThrow(/CORS_ORIGINS/);
    });
  });
});
