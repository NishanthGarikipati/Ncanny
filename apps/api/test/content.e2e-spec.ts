import type { INestApplication } from '@nestjs/common';
import type { AuthSession, WorkDetail } from '@ncanny/types';
import { api, bearer, registerPreceptor, registerScholar } from './utils/fixtures';
import { createTestHarness } from './utils/test-app';

const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
).toString('base64');

describe('Work and the academic hall (e2e)', () => {
  let app: INestApplication;
  let close: () => Promise<void>;
  let resetDatabase: () => Promise<void>;
  let seedSubjects: () => Promise<string[]>;
  let subjects: string[] = [];

  beforeAll(async () => {
    const harness = await createTestHarness();
    app = harness.app;
    close = harness.close;
    resetDatabase = harness.resetDatabase;
    seedSubjects = harness.seedSubjects;
  });

  afterAll(() => close());

  beforeEach(async () => {
    await resetDatabase();
    subjects = await seedSubjects();
  });

  async function publishEssay(session: AuthSession, title: string, visibility = 'SCHOOL') {
    const response = await api(app)
      .post('/api/v1/content')
      .set('Authorization', bearer(session))
      .send({
        type: 'ESSAY',
        title,
        body: 'The moon does not make its own light. It reflects the sun, which is why the phase changes.',
        subjectId: subjects[0],
        visibility,
      })
      .expect(201);
    return response.body.data as WorkDetail;
  }

  it('shows a school essay to a schoolmate and hides it from another school', async () => {
    const author = await registerScholar(app, subjects, { schoolName: 'North Academy' });
    const schoolmate = await registerScholar(app, subjects, {
      schoolId: author.user.schoolId ?? undefined,
    });
    const outsider = await registerScholar(app, subjects, { schoolName: 'South Academy' });
    const essay = await publishEssay(author, 'Why the moon shines');

    const feed = await api(app)
      .get('/api/v1/content')
      .set('Authorization', bearer(schoolmate))
      .expect(200);
    expect(feed.body.data.items.map((item: { title: string }) => item.title)).toContain(
      'Why the moon shines',
    );

    const hidden = await api(app)
      .get(`/api/v1/content/${essay.id}`)
      .set('Authorization', bearer(outsider))
      .expect(404);
    expect(hidden.body.error.code).toBe('CONTENT_NOT_FOUND');
    expect(JSON.stringify(hidden.body)).not.toContain(author.user.email);
  });

  it('hides a private essay from a schoolmate', async () => {
    const author = await registerScholar(app, subjects, { schoolName: 'North Academy' });
    const schoolmate = await registerScholar(app, subjects, {
      schoolId: author.user.schoolId ?? undefined,
    });
    const essay = await publishEssay(author, 'My private notes', 'PRIVATE');

    await api(app)
      .get(`/api/v1/content/${essay.id}`)
      .set('Authorization', bearer(schoolmate))
      .expect(404);

    const own = await api(app)
      .get(`/api/v1/content/${essay.id}`)
      .set('Authorization', bearer(author))
      .expect(200);
    expect(own.body.data.ownedByViewer).toBe(true);
  });

  it('lets a Preceptor mark work and refuses a Scholar mark', async () => {
    const scholar = await registerScholar(app, subjects, { schoolName: 'North Academy' });
    const preceptor = await registerPreceptor(app, subjects, {
      schoolId: scholar.user.schoolId ?? undefined,
    });
    const essay = await publishEssay(scholar, 'Phases of the moon');

    await api(app)
      .post(`/api/v1/content/${essay.id}/review`)
      .set('Authorization', bearer(scholar))
      .send({ score: 80, feedback: 'I agree with myself.' })
      .expect(403);

    const marked = await api(app)
      .post(`/api/v1/content/${essay.id}/review`)
      .set('Authorization', bearer(preceptor))
      .send({ score: 88, feedback: 'Clear explanation. Add what a new moon looks like.' })
      .expect(201);
    expect(marked.body.data.review.score).toBe(88);
    expect(marked.body.data.review.reviewerCannyId).toBe(preceptor.user.cannyId);
  });

  it('rejects a file whose bytes do not match the declared type', async () => {
    const scholar = await registerScholar(app, subjects);
    const response = await api(app)
      .post('/api/v1/media')
      .set('Authorization', bearer(scholar))
      .send({ mimeType: 'image/png', dataBase64: Buffer.from('hello world, not a png').toString('base64') })
      .expect(400);
    expect(response.body.error.code).toBe('MEDIA_TYPE_UNSUPPORTED');
  });

  it('places a published painting on the hall for the same school', async () => {
    const scholar = await registerScholar(app, subjects, { schoolName: 'North Academy' });
    const uploaded = await api(app)
      .post('/api/v1/media')
      .set('Authorization', bearer(scholar))
      .send({ mimeType: 'image/png', dataBase64: PNG })
      .expect(201);

    await api(app)
      .post('/api/v1/content')
      .set('Authorization', bearer(scholar))
      .send({
        type: 'PAINTING',
        title: 'A blue square',
        subjectId: subjects[0],
        mediaId: uploaded.body.data.id,
      })
      .expect(201);

    await api(app)
      .post('/api/v1/whiteboard/presence')
      .set('Authorization', bearer(scholar))
      .send({ optedIn: true })
      .expect(201);

    const schoolmate = await registerScholar(app, subjects, {
      schoolId: scholar.user.schoolId ?? undefined,
    });
    const hall = await api(app)
      .get('/api/v1/whiteboard/hall')
      .set('Authorization', bearer(schoolmate))
      .expect(200);

    expect(hall.body.data.works.map((work: { title: string }) => work.title)).toContain('A blue square');
    expect(hall.body.data.presence.map((person: { cannyId: string }) => person.cannyId)).toContain(
      scholar.user.cannyId,
    );
    expect(JSON.stringify(hall.body.data.presence)).not.toContain(scholar.user.email);
  });

  it('lets a schoolmate like, smile, comment and bookmark, and hides those actions from another school', async () => {
    const author = await registerScholar(app, subjects, { schoolName: 'North Academy' });
    const schoolmate = await registerScholar(app, subjects, {
      schoolId: author.user.schoolId ?? undefined,
    });
    const outsider = await registerScholar(app, subjects, { schoolName: 'South Academy' });
    const essay = await publishEssay(author, 'Shared notes');

    const liked = await api(app)
      .post(`/api/v1/content/${essay.id}/reactions`)
      .set('Authorization', bearer(schoolmate))
      .send({ kind: 'like' })
      .expect(200);
    expect(liked.body.data.engagement.likeCount).toBe(1);
    expect(liked.body.data.engagement.viewerLiked).toBe(true);

    const ownLike = await api(app)
      .post(`/api/v1/content/${essay.id}/reactions`)
      .set('Authorization', bearer(author))
      .send({ kind: 'like' })
      .expect(200);
    expect(ownLike.body.data.engagement.likeCount).toBe(2);

    await api(app)
      .post(`/api/v1/content/${essay.id}/reactions`)
      .set('Authorization', bearer(schoolmate))
      .send({ kind: 'smile' })
      .expect(200);

    const commented = await api(app)
      .post(`/api/v1/content/${essay.id}/comments`)
      .set('Authorization', bearer(schoolmate))
      .send({ body: 'The phase diagram helped.' })
      .expect(201);
    expect(commented.body.data.comments).toHaveLength(1);
    expect(commented.body.data.engagement.commentCount).toBe(1);
    expect(JSON.stringify(commented.body.data.comments)).not.toContain(schoolmate.user.email);

    const saved = await api(app)
      .post(`/api/v1/content/${essay.id}/bookmark`)
      .set('Authorization', bearer(schoolmate))
      .expect(200);
    expect(saved.body.data.engagement.bookmarked).toBe(true);

    await api(app)
      .post(`/api/v1/content/${essay.id}/comments`)
      .set('Authorization', bearer(outsider))
      .send({ body: 'I should not see this.' })
      .expect(404);

    await api(app)
      .post(`/api/v1/content/${essay.id}/comments`)
      .set('Authorization', bearer(schoolmate))
      .send({ body: 'x'.repeat(501) })
      .expect(400);
  });

  it('lets a Preceptor award a badge once, and refuses a Scholar or a self award', async () => {
    const scholar = await registerScholar(app, subjects, { schoolName: 'North Academy' });
    const preceptor = await registerPreceptor(app, subjects, {
      schoolId: scholar.user.schoolId ?? undefined,
    });
    const essay = await publishEssay(scholar, 'Badge notes');

    await api(app)
      .post(`/api/v1/content/${essay.id}/badges`)
      .set('Authorization', bearer(scholar))
      .send({ key: 'star' })
      .expect(403);

    const awarded = await api(app)
      .post(`/api/v1/content/${essay.id}/badges`)
      .set('Authorization', bearer(preceptor))
      .send({ key: 'shield' })
      .expect(201);
    expect(awarded.body.data.engagement.badges.map((badge: { key: string }) => badge.key)).toEqual(['shield']);

    await api(app)
      .post(`/api/v1/content/${essay.id}/badges`)
      .set('Authorization', bearer(preceptor))
      .send({ key: 'shield' })
      .expect(409);

    const profile = await api(app)
      .get('/api/v1/scholars/me')
      .set('Authorization', bearer(scholar))
      .expect(200);
    expect(profile.body.data.progression.badgeCount).toBe(1);

    const facultyWork = await api(app)
      .post('/api/v1/content')
      .set('Authorization', bearer(preceptor))
      .send({
        type: 'TEACHER_PRESENTATION',
        title: 'Lecture notes',
        body: 'Today we looked at how the moon reflects sunlight onto the page.',
        subjectId: subjects[0],
      })
      .expect(201);
    await api(app)
      .post(`/api/v1/content/${facultyWork.body.data.id}/badges`)
      .set('Authorization', bearer(preceptor))
      .send({ key: 'medal' })
      .expect(403);
  });

  it('lists schoolmates without contact details and changes a password', async () => {
    const scholar = await registerScholar(app, subjects, { schoolName: 'North Academy' });
    const schoolmate = await registerScholar(app, subjects, {
      schoolId: scholar.user.schoolId ?? undefined,
    });

    const roster = await api(app)
      .get('/api/v1/scholars/school-roster')
      .set('Authorization', bearer(scholar))
      .expect(200);
    const names = roster.body.data.scholars.map((person: { cannyId: string }) => person.cannyId);
    expect(names).toContain(schoolmate.user.cannyId);
    expect(JSON.stringify(roster.body.data)).not.toContain(schoolmate.user.email);
    expect(JSON.stringify(roster.body.data)).not.toContain(schoolmate.user.phone);

    await api(app)
      .post('/api/v1/auth/password')
      .set('Authorization', bearer(scholar))
      .send({ currentPassword: 'WrongPass1', newPassword: 'BetterPass2' })
      .expect(401);

    await api(app)
      .post('/api/v1/auth/password')
      .set('Authorization', bearer(scholar))
      .send({ currentPassword: 'StrongPass1', newPassword: 'BetterPass2' })
      .expect(200);

    await api(app)
      .post('/api/v1/auth/login')
      .send({ email: scholar.user.email, password: 'BetterPass2' })
      .expect(200);
  });
});
