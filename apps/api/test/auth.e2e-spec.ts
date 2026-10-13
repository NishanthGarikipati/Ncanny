import type { INestApplication } from '@nestjs/common';
import { ErrorCode } from '@ncanny/types';
import {
  api,
  bearer,
  preceptorPayload,
  registerPreceptor,
  registerScholar,
  scholarPayload,
} from './utils/fixtures';
import { createTestHarness, type TestHarness } from './utils/test-app';

describe('Authentication (e2e)', () => {
  let harness: TestHarness;
  let app: INestApplication;
  let subjectIds: string[];

  beforeAll(async () => {
    harness = await createTestHarness();
    app = harness.app;
  });

  afterAll(async () => {
    await harness.close();
  });

  beforeEach(async () => {
    await harness.resetDatabase();
    subjectIds = await harness.seedSubjects();
  });

  describe('registration', () => {
    it('registers a Scholar, issues a Canny ID and returns a signed-in session', async () => {
      const response = await api(app)
        .post('/api/v1/auth/register/scholar')
        .send(scholarPayload(subjectIds))
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.requestId).toBeDefined();

      const session = response.body.data;
      expect(session.user.role).toBe('SCHOLAR');
      expect(session.user.cannyId).toMatch(/^NCS-\d{6}$/);
      expect(session.tokens.accessToken).toBeDefined();
      expect(session.tokens.refreshToken).toContain('.');
      expect(session.redirectTo).toBe('/home');
    });

    it('registers a Preceptor with a Preceptor Canny ID prefix', async () => {
      const session = await registerPreceptor(app, subjectIds);
      expect(session.user.cannyId).toMatch(/^NCP-\d{6}$/);
      expect(session.user.role).toBe('PRECEPTOR');
    });

    it('never returns the password hash in any form', async () => {
      const response = await api(app)
        .post('/api/v1/auth/register/scholar')
        .send(scholarPayload(subjectIds))
        .expect(201);

      const serialised = JSON.stringify(response.body);
      expect(serialised).not.toContain('passwordHash');
      expect(serialised).not.toContain('StrongPass1');
      expect(serialised).not.toContain('$2a$');
    });

    it('creates the school on first registration and reuses it afterwards', async () => {
      await registerScholar(app, subjectIds, { schoolName: 'Shared School' });
      await registerScholar(app, subjectIds, { schoolName: 'Shared School' });

      const schools = await api(app).get('/api/v1/schools').query({ q: 'Shared' }).expect(200);
      expect(schools.body.data.items).toHaveLength(1);
      expect(schools.body.data.items[0].scholarCount).toBe(2);
      expect(schools.body.data.items[0].verified).toBe(false);
    });

    it('rejects a duplicate email with a precise code', async () => {
      await registerScholar(app, subjectIds, { email: 'taken@example.com' });

      const response = await api(app)
        .post('/api/v1/auth/register/scholar')
        .send(scholarPayload(subjectIds, { email: 'taken@example.com' }))
        .expect(409);

      expect(response.body.error.code).toBe(ErrorCode.EMAIL_ALREADY_REGISTERED);
    });

    it('rejects a duplicate phone number', async () => {
      await registerScholar(app, subjectIds, { phone: '+14155559999' });

      const response = await api(app)
        .post('/api/v1/auth/register/preceptor')
        .send(preceptorPayload(subjectIds, { phone: '+14155559999' }))
        .expect(409);

      expect(response.body.error.code).toBe(ErrorCode.PHONE_ALREADY_REGISTERED);
    });

    it('rejects a weak password with a field-level message', async () => {
      const response = await api(app)
        .post('/api/v1/auth/register/scholar')
        .send(scholarPayload(subjectIds, { password: 'weak' }))
        .expect(400);

      expect(response.body.error.code).toBe(ErrorCode.VALIDATION_ERROR);
      expect(
        response.body.error.details.some((d: { field: string }) => d.field === 'password'),
      ).toBe(true);
    });

    it('rejects a mismatched password confirmation', async () => {
      const payload = { ...scholarPayload(subjectIds), confirmPassword: 'DifferentPass1' };
      const response = await api(app)
        .post('/api/v1/auth/register/scholar')
        .send(payload)
        .expect(400);

      expect(
        response.body.error.details.some((d: { field: string }) => d.field === 'confirmPassword'),
      ).toBe(true);
    });

    it('rejects subject ids that are not in the catalogue', async () => {
      const response = await api(app)
        .post('/api/v1/auth/register/scholar')
        .send(scholarPayload(subjectIds, { subjectIds: ['507f1f77bcf86cd799439011'] }))
        .expect(400);

      expect(response.body.error.code).toBe(ErrorCode.VALIDATION_ERROR);
    });

    it('rejects an unknown school id', async () => {
      const response = await api(app)
        .post('/api/v1/auth/register/scholar')
        .send(scholarPayload(subjectIds, { schoolId: '507f1f77bcf86cd799439011' }))
        .expect(404);

      expect(response.body.error.code).toBe(ErrorCode.SCHOOL_NOT_FOUND);
    });

    it('issues distinct Canny IDs to different users', async () => {
      const first = await registerScholar(app, subjectIds);
      const second = await registerScholar(app, subjectIds);
      expect(first.user.cannyId).not.toBe(second.user.cannyId);
    });
  });

  describe('sign-in with password', () => {
    beforeEach(async () => {
      await registerScholar(app, subjectIds, {
        email: 'signin@example.com',
        password: 'StrongPass1',
      });
    });

    it('signs in with valid credentials', async () => {
      const response = await api(app)
        .post('/api/v1/auth/login')
        .send({ email: 'signin@example.com', password: 'StrongPass1' })
        .expect(200);

      expect(response.body.data.tokens.accessToken).toBeDefined();
      expect(response.body.data.user.email).toBe('signin@example.com');
    });

    it('accepts the email case-insensitively', async () => {
      await api(app)
        .post('/api/v1/auth/login')
        .send({ email: 'SignIn@Example.com', password: 'StrongPass1' })
        .expect(200);
    });

    it('reports an unknown email and a wrong password identically', async () => {
      const wrongPassword = await api(app)
        .post('/api/v1/auth/login')
        .send({ email: 'signin@example.com', password: 'WrongPass1' })
        .expect(401);

      const unknownEmail = await api(app)
        .post('/api/v1/auth/login')
        .send({ email: 'nobody@example.com', password: 'StrongPass1' })
        .expect(401);

      expect(wrongPassword.body.error.code).toBe(ErrorCode.INVALID_CREDENTIALS);
      expect(unknownEmail.body.error).toEqual(wrongPassword.body.error);
    });
  });

  describe('sign-in with a one-time code', () => {
    const phone = '+14155557777';

    beforeEach(async () => {
      await registerScholar(app, subjectIds, { phone });
    });

    it('signs in with a valid code', async () => {
      const requested = await api(app).post('/api/v1/auth/otp/request').send({ phone }).expect(200);

      expect(requested.body.data.sent).toBe(true);
      const code = requested.body.data.debugCode;

      const verified = await api(app)
        .post('/api/v1/auth/otp/verify')
        .send({ phone, code })
        .expect(200);

      expect(verified.body.data.tokens.accessToken).toBeDefined();
      expect(verified.body.data.user.phoneVerified).toBe(true);
    });

    it('invalidates a code once it has been used', async () => {
      const requested = await api(app).post('/api/v1/auth/otp/request').send({ phone });
      const code = requested.body.data.debugCode;

      await api(app).post('/api/v1/auth/otp/verify').send({ phone, code }).expect(200);

      const reuse = await api(app)
        .post('/api/v1/auth/otp/verify')
        .send({ phone, code })
        .expect(401);
      expect(reuse.body.error.code).toBe(ErrorCode.OTP_INVALID);
    });

    it('invalidates an earlier code when a new one is requested', async () => {
      const first = await api(app).post('/api/v1/auth/otp/request').send({ phone });
      await api(app).post('/api/v1/auth/otp/request').send({ phone });

      const response = await api(app)
        .post('/api/v1/auth/otp/verify')
        .send({ phone, code: first.body.data.debugCode })
        .expect(401);

      expect(response.body.error.code).toBe(ErrorCode.OTP_INVALID);
    });

    it('locks the challenge after too many incorrect attempts', async () => {
      await api(app).post('/api/v1/auth/otp/request').send({ phone });

      for (let attempt = 0; attempt < 3; attempt += 1) {
        await api(app).post('/api/v1/auth/otp/verify').send({ phone, code: '000000' });
      }

      const response = await api(app)
        .post('/api/v1/auth/otp/verify')
        .send({ phone, code: '000000' })
        .expect(401);

      expect(response.body.error.code).toBe(ErrorCode.OTP_ATTEMPTS_EXCEEDED);
    });

    it('does not reveal whether a phone number is registered', async () => {
      const unregistered = await api(app)
        .post('/api/v1/auth/otp/request')
        .send({ phone: '+14155550000' })
        .expect(200);

      expect(unregistered.body.data.sent).toBe(true);

      // The code is well-formed but belongs to no account, so it cannot sign in.
      await api(app)
        .post('/api/v1/auth/otp/verify')
        .send({ phone: '+14155550000', code: unregistered.body.data.debugCode })
        .expect(401);
    });
  });

  describe('sessions', () => {
    it('rotates the refresh token and rejects the superseded one', async () => {
      const session = await registerScholar(app, subjectIds);

      const refreshed = await api(app)
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: session.tokens.refreshToken })
        .expect(200);

      const rotated = refreshed.body.data.refreshToken;
      expect(rotated).not.toBe(session.tokens.refreshToken);

      const reuse = await api(app)
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: session.tokens.refreshToken })
        .expect(401);

      expect(reuse.body.error.code).toBe(ErrorCode.SESSION_REVOKED);

      // Reuse detection revokes the whole family, including the rotated token.
      await api(app).post('/api/v1/auth/refresh').send({ refreshToken: rotated }).expect(401);
    });

    it('rejects a malformed refresh token', async () => {
      await api(app)
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: 'not-a-valid-refresh-token-value' })
        .expect(401);
    });

    it('lists active sessions and marks the current one', async () => {
      const session = await registerScholar(app, subjectIds, { email: 'sessions@example.com' });
      await api(app)
        .post('/api/v1/auth/login')
        .send({ email: 'sessions@example.com', password: 'StrongPass1' })
        .expect(200);

      const response = await api(app)
        .get('/api/v1/auth/sessions')
        .set('Authorization', bearer(session))
        .expect(200);

      expect(response.body.data).toHaveLength(2);
      expect(response.body.data.filter((s: { current: boolean }) => s.current)).toHaveLength(1);
    });

    it('signs out the current session only', async () => {
      const session = await registerScholar(app, subjectIds);

      await api(app)
        .post('/api/v1/auth/logout')
        .set('Authorization', bearer(session))
        .send({ refreshToken: session.tokens.refreshToken })
        .expect(200);

      // The access token is rejected because the session behind it is gone.
      await api(app).get('/api/v1/auth/me').set('Authorization', bearer(session)).expect(401);
    });

    it('signs out every session at once', async () => {
      const first = await registerScholar(app, subjectIds, { email: 'everywhere@example.com' });
      const second = await api(app)
        .post('/api/v1/auth/login')
        .send({ email: 'everywhere@example.com', password: 'StrongPass1' })
        .expect(200);

      const response = await api(app)
        .post('/api/v1/auth/logout-all')
        .set('Authorization', bearer(first))
        .expect(200);

      expect(response.body.data.revokedSessions).toBe(2);

      await api(app).get('/api/v1/auth/me').set('Authorization', bearer(first)).expect(401);
      await api(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${second.body.data.tokens.accessToken}`)
        .expect(401);
    });
  });

  describe('current account', () => {
    it('returns the account, including contact details, to its owner', async () => {
      const session = await registerScholar(app, subjectIds, { email: 'me@example.com' });

      const response = await api(app)
        .get('/api/v1/auth/me')
        .set('Authorization', bearer(session))
        .expect(200);

      expect(response.body.data.email).toBe('me@example.com');
      expect(response.body.data.phone).toBeDefined();
    });

    it('requires authentication', async () => {
      const response = await api(app).get('/api/v1/auth/me').expect(401);
      expect(response.body.error.code).toBe(ErrorCode.UNAUTHENTICATED);
    });

    it('rejects a malformed or tampered token', async () => {
      await api(app).get('/api/v1/auth/me').set('Authorization', 'Bearer not.a.token').expect(401);

      const session = await registerScholar(app, subjectIds);
      const tampered = `${session.tokens.accessToken.slice(0, -4)}aaaa`;
      await api(app).get('/api/v1/auth/me').set('Authorization', `Bearer ${tampered}`).expect(401);
    });
  });
});
