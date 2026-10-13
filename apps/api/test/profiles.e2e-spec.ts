import type { INestApplication } from '@nestjs/common';
import { ErrorCode, type AuthSession } from '@ncanny/types';
import { api, bearer, registerPreceptor, registerScholar } from './utils/fixtures';
import { createTestHarness, type TestHarness } from './utils/test-app';

describe('Profiles (e2e)', () => {
  let harness: TestHarness;
  let app: INestApplication;
  let subjectIds: string[];
  let scholar: AuthSession;
  let schoolId: string;

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
    scholar = await registerScholar(app, subjectIds);
    schoolId = scholar.user.schoolId as string;
  });

  describe('reading own profile', () => {
    it('returns the Scholar profile with identity, school and zeroed progression', async () => {
      const response = await api(app)
        .get('/api/v1/scholars/me')
        .set('Authorization', bearer(scholar))
        .expect(200);

      const profile = response.body.data;
      expect(profile.cannyId).toBe(scholar.user.cannyId);
      expect(profile.role).toBe('SCHOLAR');
      expect(profile.grade).toBe('GRADE_7');
      expect(profile.school.name).toBe('Ncanny School');
      expect(profile.progression).toEqual({
        xp: 0,
        level: 1,
        rank: null,
        badgeCount: 0,
        streakDays: 0,
      });
      expect(profile.contentStats.total).toBe(0);
    });

    it('returns the Preceptor profile with zeroed interaction statistics', async () => {
      const preceptor = await registerPreceptor(app, subjectIds, { schoolId });

      const response = await api(app)
        .get('/api/v1/preceptors/me')
        .set('Authorization', bearer(preceptor))
        .expect(200);

      expect(response.body.data.interactionStats).toEqual({
        scholarsInteractedWith: 0,
        submissionsReviewed: 0,
        feedbackProvided: 0,
        marksProvided: 0,
        badgesAwarded: 0,
        contentUploaded: 0,
      });
    });

    it('never exposes contact details on a profile', async () => {
      const response = await api(app)
        .get('/api/v1/scholars/me')
        .set('Authorization', bearer(scholar))
        .expect(200);

      expect(response.body.data.email).toBeUndefined();
      expect(response.body.data.phone).toBeUndefined();
    });
  });

  describe('role separation', () => {
    it('refuses a Preceptor access to the Scholar profile endpoint', async () => {
      const preceptor = await registerPreceptor(app, subjectIds, { schoolId });

      const response = await api(app)
        .get('/api/v1/scholars/me')
        .set('Authorization', bearer(preceptor))
        .expect(403);

      expect(response.body.error.code).toBe(ErrorCode.INSUFFICIENT_ROLE);
    });

    it('refuses a Scholar the ability to update a Preceptor profile', async () => {
      await api(app)
        .patch('/api/v1/preceptors/me')
        .set('Authorization', bearer(scholar))
        .send({ bio: 'Attempting to edit a Preceptor profile' })
        .expect(403);
    });

    it('requires authentication for own-profile endpoints', async () => {
      await api(app).get('/api/v1/scholars/me').expect(401);
      await api(app).patch('/api/v1/scholars/me').send({ bio: 'x' }).expect(401);
    });
  });

  describe('visibility', () => {
    it('shows a school-visible profile to a schoolmate', async () => {
      const schoolmate = await registerScholar(app, subjectIds, { schoolId });

      const response = await api(app)
        .get(`/api/v1/scholars/${scholar.user.cannyId}`)
        .set('Authorization', bearer(schoolmate))
        .expect(200);

      expect(response.body.data.cannyId).toBe(scholar.user.cannyId);
    });

    it('hides a school-visible profile from a different school', async () => {
      const outsider = await registerScholar(app, subjectIds, { schoolName: 'Other School' });

      const response = await api(app)
        .get(`/api/v1/scholars/${scholar.user.cannyId}`)
        .set('Authorization', bearer(outsider))
        .expect(404);

      expect(response.body.error.code).toBe(ErrorCode.PROFILE_NOT_FOUND);
    });

    it('hides a school-visible profile from an anonymous visitor', async () => {
      await api(app).get(`/api/v1/scholars/${scholar.user.cannyId}`).expect(404);
    });

    it('shows a public profile to an anonymous visitor', async () => {
      await api(app)
        .patch('/api/v1/scholars/me')
        .set('Authorization', bearer(scholar))
        .send({ visibility: 'PUBLIC' })
        .expect(200);

      const response = await api(app).get(`/api/v1/scholars/${scholar.user.cannyId}`).expect(200);

      expect(response.body.data.cannyId).toBe(scholar.user.cannyId);
    });

    it('hides a private profile from a schoolmate but not from its owner', async () => {
      const schoolmate = await registerScholar(app, subjectIds, { schoolId });

      await api(app)
        .patch('/api/v1/scholars/me')
        .set('Authorization', bearer(scholar))
        .send({ visibility: 'PRIVATE' })
        .expect(200);

      await api(app)
        .get(`/api/v1/scholars/${scholar.user.cannyId}`)
        .set('Authorization', bearer(schoolmate))
        .expect(404);

      await api(app)
        .get(`/api/v1/scholars/${scholar.user.cannyId}`)
        .set('Authorization', bearer(scholar))
        .expect(200);
    });

    it('lets a Preceptor at the same school view a Scholar profile', async () => {
      const preceptor = await registerPreceptor(app, subjectIds, { schoolId });

      await api(app)
        .get(`/api/v1/scholars/${scholar.user.cannyId}`)
        .set('Authorization', bearer(preceptor))
        .expect(200);
    });

    it('reports an unknown Canny ID as not found', async () => {
      await api(app)
        .get('/api/v1/scholars/NCS-000001')
        .set('Authorization', bearer(scholar))
        .expect(404);
    });

    it('rejects a malformed Canny ID', async () => {
      const response = await api(app)
        .get('/api/v1/scholars/not-a-canny-id')
        .set('Authorization', bearer(scholar))
        .expect(400);

      expect(response.body.error.code).toBe(ErrorCode.VALIDATION_ERROR);
    });
  });

  describe('updating a profile', () => {
    it('updates academic fields and reflects them immediately', async () => {
      const response = await api(app)
        .patch('/api/v1/scholars/me')
        .set('Authorization', bearer(scholar))
        .send({
          grade: 'GRADE_9',
          bio: 'I like building model rockets.',
          interestedSubjectIds: [subjectIds[4]],
        })
        .expect(200);

      expect(response.body.data.grade).toBe('GRADE_9');
      expect(response.body.data.bio).toBe('I like building model rockets.');
      expect(response.body.data.interestedSubjectIds).toEqual([subjectIds[4]]);
    });

    it('updates the display name, which lives on the account record', async () => {
      await api(app)
        .patch('/api/v1/scholars/me')
        .set('Authorization', bearer(scholar))
        .send({ fullName: 'Aarav Mehta' })
        .expect(200);

      const me = await api(app)
        .get('/api/v1/auth/me')
        .set('Authorization', bearer(scholar))
        .expect(200);

      expect(me.body.data.fullName).toBe('Aarav Mehta');
    });

    it('rejects an empty update rather than recording a no-op change', async () => {
      await api(app)
        .patch('/api/v1/scholars/me')
        .set('Authorization', bearer(scholar))
        .send({})
        .expect(400);
    });

    it('rejects subjects that are not in the catalogue', async () => {
      const response = await api(app)
        .patch('/api/v1/scholars/me')
        .set('Authorization', bearer(scholar))
        .send({ subjectIds: ['507f1f77bcf86cd799439011'] })
        .expect(400);

      expect(response.body.error.code).toBe(ErrorCode.VALIDATION_ERROR);
    });

    it('rejects a bio longer than the limit', async () => {
      await api(app)
        .patch('/api/v1/scholars/me')
        .set('Authorization', bearer(scholar))
        .send({ bio: 'x'.repeat(401) })
        .expect(400);
    });

    it('rejects an unknown visibility value', async () => {
      await api(app)
        .patch('/api/v1/scholars/me')
        .set('Authorization', bearer(scholar))
        .send({ visibility: 'EVERYONE' })
        .expect(400);
    });

    it('ignores fields a client is not allowed to set', async () => {
      await api(app)
        .patch('/api/v1/scholars/me')
        .set('Authorization', bearer(scholar))
        .send({ bio: 'Legitimate change', progression: { xp: 999999, level: 99 } })
        .expect(200);

      const profile = await api(app)
        .get('/api/v1/scholars/me')
        .set('Authorization', bearer(scholar))
        .expect(200);

      expect(profile.body.data.progression.xp).toBe(0);
      expect(profile.body.data.progression.level).toBe(1);
    });
  });
});
