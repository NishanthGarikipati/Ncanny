import { UserRole } from '@ncanny/types';
import { CannyIdService } from './canny-id.service';

describe('CannyIdService formatting', () => {
  it('uses a role prefix and six zero-padded digits', () => {
    expect(CannyIdService.format(UserRole.SCHOLAR, 48213)).toBe('NCS-048213');
    expect(CannyIdService.format(UserRole.PRECEPTOR, 104822)).toBe('NCP-104822');
    expect(CannyIdService.format(UserRole.SCHOLAR, 0)).toBe('NCS-000000');
  });

  it('refuses to format an identifier for a role that has no academic identity', () => {
    expect(() => CannyIdService.format(UserRole.NCANNY_ADMIN, 1)).toThrow();
    expect(CannyIdService.appliesTo(UserRole.SCHOOL_ADMIN)).toBe(false);
    expect(CannyIdService.appliesTo(UserRole.SCHOLAR)).toBe(true);
  });

  it.each(['NCS-000000', 'NCP-999999', 'NCS-048213'])('accepts %s as valid', (cannyId) => {
    expect(CannyIdService.isValid(cannyId)).toBe(true);
  });

  it.each(['NCS-12345', 'NCX-123456', 'ncs-123456', 'NCS123456', '123456', ''])(
    'rejects %s as invalid',
    (cannyId) => {
      expect(CannyIdService.isValid(cannyId)).toBe(false);
    },
  );
});

describe('CannyIdService issuance', () => {
  const service = (existing: Set<string>) =>
    new CannyIdService({
      exists: async ({ cannyId }: { cannyId: string }) => (existing.has(cannyId) ? {} : null),
    } as never);

  it('issues an identifier of the correct shape for the role', async () => {
    const issued = await service(new Set()).issue(UserRole.PRECEPTOR);
    expect(issued).toMatch(/^NCP-\d{6}$/);
  });

  it('retries past a collision rather than reusing an identifier', async () => {
    const taken = new Set<string>();
    const instance = service(taken);
    const first = await instance.issue(UserRole.SCHOLAR);
    taken.add(first);

    const second = await instance.issue(UserRole.SCHOLAR);
    expect(second).not.toBe(first);
  });

  it('reports exhaustion instead of looping forever when the space is full', async () => {
    const everythingTaken = { exists: async () => ({}) };
    const instance = new CannyIdService(everythingTaken as never);

    await expect(instance.issue(UserRole.SCHOLAR)).rejects.toMatchObject({
      code: 'CANNY_ID_GENERATION_FAILED',
    });
  });

  it('refuses to issue for a role without an academic identity', async () => {
    await expect(service(new Set()).issue(UserRole.NCANNY_ADMIN)).rejects.toThrow();
  });
});
