import { UserRole, Visibility } from '@ncanny/types';
import { canViewProfile, type Viewer, type VisibilityTarget } from './visibility.policy';

const target = (visibility: Visibility): VisibilityTarget => ({
  ownerUserId: 'owner-1',
  schoolId: 'school-1',
  visibility,
});

const viewer = (overrides: Partial<Viewer> = {}): Viewer => ({
  userId: 'viewer-1',
  role: UserRole.SCHOLAR,
  schoolId: 'school-1',
  ...overrides,
});

describe('canViewProfile', () => {
  it('always allows the owner, whatever the visibility', () => {
    for (const visibility of Object.values(Visibility)) {
      expect(canViewProfile(target(visibility), viewer({ userId: 'owner-1' }))).toBe(true);
    }
  });

  it('allows anyone, including anonymous viewers, to see a public profile', () => {
    expect(canViewProfile(target(Visibility.PUBLIC), null)).toBe(true);
    expect(canViewProfile(target(Visibility.PUBLIC), viewer({ schoolId: 'other-school' }))).toBe(
      true,
    );
  });

  it('restricts a school profile to members of the same school', () => {
    expect(canViewProfile(target(Visibility.SCHOOL), viewer())).toBe(true);
    expect(canViewProfile(target(Visibility.SCHOOL), viewer({ schoolId: 'school-2' }))).toBe(false);
    expect(canViewProfile(target(Visibility.SCHOOL), viewer({ schoolId: null }))).toBe(false);
    expect(canViewProfile(target(Visibility.SCHOOL), null)).toBe(false);
  });

  it('allows a Preceptor at the same school to view a Scholar profile', () => {
    expect(canViewProfile(target(Visibility.SCHOOL), viewer({ role: UserRole.PRECEPTOR }))).toBe(
      true,
    );
  });

  it('hides a private profile from everyone except the owner and platform admins', () => {
    expect(canViewProfile(target(Visibility.PRIVATE), viewer())).toBe(false);
    expect(canViewProfile(target(Visibility.PRIVATE), viewer({ role: UserRole.PRECEPTOR }))).toBe(
      false,
    );
    expect(
      canViewProfile(target(Visibility.PRIVATE), viewer({ role: UserRole.SCHOOL_ADMIN })),
    ).toBe(false);
    expect(
      canViewProfile(target(Visibility.PRIVATE), viewer({ role: UserRole.NCANNY_ADMIN })),
    ).toBe(true);
  });

  it('treats CONNECTIONS as owner-only until the connection graph exists', () => {
    expect(canViewProfile(target(Visibility.CONNECTIONS), viewer())).toBe(false);
  });

  it('denies an unrecognised visibility value rather than defaulting to open', () => {
    const unknown = { ...target(Visibility.PUBLIC), visibility: 'SOMETHING_NEW' as Visibility };
    expect(canViewProfile(unknown, viewer())).toBe(false);
  });
});
