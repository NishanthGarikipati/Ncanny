import type { INestApplication } from '@nestjs/common';
import { ErrorCode } from '@ncanny/types';
import { api, registerScholar, scholarPayload } from './utils/fixtures';
import { createTestHarness, type TestHarness } from './utils/test-app';

describe('Platform foundations (e2e)', () => {
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

  describe('health', () => {
    it('reports a connected database', async () => {
      const response = await api(app).get('/api/v1/health').expect(200);
      expect(response.body.data.status).toBe('ok');
      expect(response.body.data.database).toBe('connected');
    });
  });

  describe('response envelope', () => {
    it('wraps successful responses and echoes the request id header', async () => {
      const response = await api(app).get('/api/v1/subjects').expect(200);

      expect(response.body).toMatchObject({ success: true });
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.requestId).toBeDefined();
      expect(response.headers['x-request-id']).toBe(response.body.requestId);
    });

    it('honours a request id supplied by the caller, so traces join up', async () => {
      const response = await api(app)
        .get('/api/v1/subjects')
        .set('x-request-id', 'trace-from-the-web-app')
        .expect(200);

      expect(response.body.requestId).toBe('trace-from-the-web-app');
    });

    it('returns the standard failure envelope for an unknown route', async () => {
      const response = await api(app).get('/api/v1/does-not-exist').expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe(ErrorCode.NOT_FOUND);
      expect(response.body.requestId).toBeDefined();
      expect(response.body.error.stack).toBeUndefined();
    });

    it('returns field-level detail for an invalid payload', async () => {
      const response = await api(app)
        .post('/api/v1/auth/login')
        .send({ email: 'not-an-email', password: '' })
        .expect(400);

      expect(response.body.error.code).toBe(ErrorCode.VALIDATION_ERROR);
      const fields = response.body.error.details.map((d: { field: string }) => d.field);
      expect(fields).toContain('email');
      expect(fields).toContain('password');
    });
  });

  describe('subjects', () => {
    it('lists the seeded catalogue without authentication', async () => {
      const response = await api(app).get('/api/v1/subjects').expect(200);

      expect(response.body.data.length).toBeGreaterThan(10);
      expect(response.body.data[0]).toMatchObject({ code: 'mathematics', name: 'Mathematics' });
    });

    it('is idempotent when seeded repeatedly', async () => {
      const before = await api(app).get('/api/v1/subjects').expect(200);
      await harness.seedSubjects();
      const after = await api(app).get('/api/v1/subjects').expect(200);

      expect(after.body.data).toHaveLength(before.body.data.length);
    });
  });

  describe('schools', () => {
    beforeEach(async () => {
      await registerScholar(app, subjectIds, { schoolName: 'Aurora Public School' });
      await registerScholar(app, subjectIds, { schoolName: 'Beacon Academy' });
    });

    it('searches case-insensitively by name prefix', async () => {
      const response = await api(app).get('/api/v1/schools').query({ q: 'aurora' }).expect(200);

      expect(response.body.data.items).toHaveLength(1);
      expect(response.body.data.items[0].name).toBe('Aurora Public School');
    });

    it('paginates with a cursor', async () => {
      const first = await api(app).get('/api/v1/schools').query({ limit: 1 }).expect(200);

      expect(first.body.data.items).toHaveLength(1);
      expect(first.body.data.hasMore).toBe(true);

      const second = await api(app)
        .get('/api/v1/schools')
        .query({ limit: 1, cursor: first.body.data.nextCursor })
        .expect(200);

      expect(second.body.data.items[0].id).not.toBe(first.body.data.items[0].id);
      expect(second.body.data.hasMore).toBe(false);
    });

    it('does not return school contact details to anonymous callers', async () => {
      const response = await api(app).get('/api/v1/schools').expect(200);

      for (const school of response.body.data.items) {
        expect(school.contactEmail).toBeUndefined();
        expect(school.contactPhone).toBeUndefined();
        expect(school.subscription).toBeUndefined();
      }
    });

    it('treats a regular expression in the query as literal text', async () => {
      const response = await api(app).get('/api/v1/schools').query({ q: '.*' }).expect(200);
      expect(response.body.data.items).toHaveLength(0);
    });

    it('rejects an invalid pagination cursor', async () => {
      await api(app).get('/api/v1/schools').query({ cursor: 'nonsense' }).expect(400);
    });
  });
});

describe('Rate limiting (e2e)', () => {
  let harness: TestHarness;
  let app: INestApplication;

  beforeAll(async () => {
    harness = await createTestHarness({
      enableRateLimit: true,
      env: { RATE_LIMIT_LIMIT: '1000' },
    });
    app = harness.app;
    await harness.resetDatabase();
    await harness.seedSubjects();
  });

  afterAll(async () => {
    await harness.close();
  });

  it('throttles repeated sign-in attempts and returns the standard envelope', async () => {
    const attempt = () =>
      api(app).post('/api/v1/auth/login').send({ email: 'a@example.com', password: 'WrongPass1' });

    let throttled: { status: number; body: { error: { code: string } } } | undefined;
    for (let index = 0; index < 15; index += 1) {
      const response = await attempt();
      if (response.status === 429) {
        throttled = response;
        break;
      }
    }

    expect(throttled).toBeDefined();
    expect(throttled?.body.error.code).toBe(ErrorCode.RATE_LIMITED);
  });

  it('applies a stricter limit to one-time-code requests than the global default', async () => {
    const phone = '+14155558888';
    let throttledAt: number | null = null;

    for (let index = 0; index < 10; index += 1) {
      const response = await api(app).post('/api/v1/auth/otp/request').send({ phone });
      if (response.status === 429) {
        throttledAt = index;
        break;
      }
    }

    expect(throttledAt).not.toBeNull();
    expect(throttledAt).toBeLessThan(8);
  });

  it('does not throttle ordinary reads at the authentication endpoints’ rate', async () => {
    for (let index = 0; index < 20; index += 1) {
      await api(app).get('/api/v1/subjects').expect(200);
    }
  });
});

describe('Registration guard rails (e2e)', () => {
  let harness: TestHarness;
  let app: INestApplication;

  beforeAll(async () => {
    harness = await createTestHarness();
    app = harness.app;
  });

  afterAll(async () => {
    await harness.close();
  });

  beforeEach(async () => {
    await harness.resetDatabase();
  });

  it('rejects a registration that names no school at all', async () => {
    const subjectIds = await harness.seedSubjects();
    const payload = scholarPayload(subjectIds) as Record<string, unknown>;
    delete payload.schoolName;
    delete payload.schoolAddress;

    const response = await api(app).post('/api/v1/auth/register/scholar').send(payload).expect(400);

    expect(response.body.error.code).toBe(ErrorCode.VALIDATION_ERROR);
  });

  it('rejects a phone number that is not in international format', async () => {
    const subjectIds = await harness.seedSubjects();

    await api(app)
      .post('/api/v1/auth/register/scholar')
      .send({ ...scholarPayload(subjectIds), phone: '4155550123' })
      .expect(400);
  });
});
