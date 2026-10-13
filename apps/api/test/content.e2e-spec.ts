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
});
