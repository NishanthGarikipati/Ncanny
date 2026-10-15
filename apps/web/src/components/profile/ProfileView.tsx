'use client';

import { ApiError } from '@ncanny/api-client';
import {
  ContentType,
  GRADE_LABELS,
  UserRole,
  Visibility,
  type AnyProfile,
  type PreceptorProfile,
  type ScholarProfile,
  type Subject,
  type WorkCard,
} from '@ncanny/types';
import {
  Alert,
  Badge,
  Button,
  EmptyState,
  LoadingState,
  StatCard,
  TabPanel,
  Tabs,
} from '@ncanny/ui';
import { useCallback, useEffect, useState } from 'react';
import { getApiClient } from '../../lib/api';
import { useAuthStore } from '../../lib/auth-store';
import { MarkStars, Portrait } from '../neon';
import { WorkPlaque } from '../content/WorkPlaque';
import { ProfileEditor } from './ProfileEditor';

const VISIBILITY_LABELS: Record<string, string> = {
  [Visibility.PUBLIC]: 'Anyone on Ncanny',
  [Visibility.SCHOOL]: 'My school only',
  [Visibility.CONNECTIONS]: 'My connections',
  [Visibility.PRIVATE]: 'Only me',
};

function isScholar(profile: AnyProfile): profile is ScholarProfile {
  return profile.role === UserRole.SCHOLAR;
}

export function ProfileView({ cannyId }: { cannyId: string }) {
  const viewer = useAuthStore((state) => state.user);
  const [profile, setProfile] = useState<AnyProfile | null>(null);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [contentTab, setContentTab] = useState('paintings');
  const [works, setWorks] = useState<WorkCard[]>([]);

  const isOwnProfile = viewer?.cannyId === cannyId;

  const load = useCallback(async () => {
    setError(null);
    const client = getApiClient();
    // The Canny ID prefix identifies the role, so the correct endpoint is known
    // without an extra lookup.
    const scholar = cannyId.startsWith('NCS-');

    try {
      const loaded = isOwnProfile
        ? await (scholar ? client.scholars.me() : client.preceptors.me())
        : await (scholar
            ? client.scholars.byCannyId(cannyId)
            : client.preceptors.byCannyId(cannyId));
      setProfile(loaded);
    } catch (cause) {
      setError(
        cause instanceof ApiError && cause.status === 404
          ? 'No profile is available for that Canny ID.'
          : 'Could not load this profile. Please try again.',
      );
    }
  }, [cannyId, isOwnProfile]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const controller = new AbortController();
    getApiClient()
      .subjects.list({ signal: controller.signal })
      .then(setSubjects)
      .catch(() => setSubjects([]));
    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (!isOwnProfile) return undefined;
    const controller = new AbortController();
    getApiClient()
      .content.mine({ signal: controller.signal })
      .then(setWorks)
      .catch(() => setWorks([]));
    return () => controller.abort();
  }, [isOwnProfile]);

  if (error) {
    return <Alert tone="danger">{error}</Alert>;
  }

  if (!profile) {
    return <LoadingState label="Loading profile" />;
  }

  const subjectNames = (ids: string[]) =>
    ids
      .map((id) => subjects.find((subject) => subject.id === id)?.name)
      .filter((name): name is string => Boolean(name));

  const scholar = isScholar(profile);
  const preceptor = profile as PreceptorProfile;

  const shelfType: Record<string, ContentType> = {
    paintings: ContentType.PAINTING,
    essays: ContentType.ESSAY,
    elocution: ContentType.ELOCUTION,
    study: ContentType.STUDY_ACTIVITY,
  };
  const shelf = works.filter((work) => work.type === shelfType[contentTab]);

  const xpWidth = profile.progression.xp <= 0 ? 0 : Math.min(100, profile.progression.xp % 100 || 100);
  const classLine = scholar
    ? [GRADE_LABELS[profile.grade], profile.section && `Section ${profile.section}`].filter(Boolean).join(' · ')
    : preceptor.preceptorRole;

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <section className="hud-frame p-4 sm:p-6">
        <div className="flex justify-center">
          <h1 className="neon-title text-xl sm:text-2xl">{scholar ? 'Ncanny Scholar' : 'Ncanny Preceptor'}</h1>
        </div>
        <div className="mt-5 grid gap-5 lg:grid-cols-[16rem_1fr]">
          <aside className="flex flex-col items-center rounded-2xl border border-primary/40 bg-surface-sunken/70 p-4">
            <Portrait name={profile.fullName} src={profile.avatarUrl} />
            <p className="id-plate w-full text-sm">Canny ID</p>
            <p className="mt-2 font-mono text-sm text-content">{profile.cannyId}</p>
            <dl className="mt-4 w-full space-y-3 text-sm">
              <div>
                <dt className="text-content-muted">Full name</dt>
                <dd className="font-semibold text-content">{profile.fullName}</dd>
              </div>
              <div>
                <dt className="text-content-muted">School</dt>
                <dd className="font-semibold text-content">{profile.school.name}</dd>
              </div>
              {classLine && (
                <div>
                  <dt className="text-content-muted">Class</dt>
                  <dd className="font-semibold text-content">{classLine}</dd>
                </div>
              )}
            </dl>
            <div className="mt-4 w-full">
              <div className="flex justify-between text-xs text-content-muted">
                <span>Level {profile.progression.level}</span>
                <span>{profile.progression.xp} XP</span>
              </div>
              <div
                className="mt-1 h-2 overflow-hidden rounded-full bg-surface"
                role="meter"
                aria-label="Experience"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={xpWidth}
              >
                <div className="h-full rounded-full bg-primary" style={{ width: `${xpWidth}%` }} />
              </div>
              <p className="mt-2 text-xs text-content-muted">
                {profile.progression.rank === null ? 'Unranked' : `Rank ${profile.progression.rank}`}
              </p>
            </div>
            {isOwnProfile && (
              <Button className="mt-4" variant="secondary" onClick={() => setEditing((value) => !value)}>
                {editing ? 'Cancel' : 'Edit profile'}
              </Button>
            )}
          </aside>
          <div>
            <Tabs
              tone="pill"
              aria-label="Work"
              activeId={contentTab}
              onChange={setContentTab}
              items={[
                { id: 'paintings', label: 'Paintings', count: scholar ? profile.contentStats.paintings : 0 },
                { id: 'essays', label: 'Essays', count: scholar ? profile.contentStats.essays : 0 },
                { id: 'elocution', label: 'Elocution', count: scholar ? profile.contentStats.elocutions : 0 },
                { id: 'study', label: 'Study activities', count: scholar ? profile.contentStats.studyActivities : 0 },
              ]}
            />
            <div className="mt-4 flex flex-wrap gap-2">
              {(scholar ? subjectNames(profile.subjectIds) : subjectNames(preceptor.teachingSubjectIds)).map((name) => (
                <Badge key={name} tone="primary">
                  {name}
                </Badge>
              ))}
            </div>
            {profile.bio && <p className="mt-3 text-sm text-content">{profile.bio}</p>}
            <TabPanel id={contentTab} activeId={contentTab}>
              {shelf.length === 0 ? (
                <EmptyState
                  title={`No ${contentTab === 'study' ? 'study activities' : contentTab} yet`}
                  description={
                    isOwnProfile
                      ? 'Publish from Create and this shelf fills in. Your school sees it on the whiteboard.'
                      : 'Open the whiteboard to read work this person has shared with the school.'
                  }
                />
              ) : (
                <ul className="grid gap-3 sm:grid-cols-2">
                  {shelf.map((work) => (
                    <li key={work.id}>
                      <WorkPlaque work={work} />
                    </li>
                  ))}
                </ul>
              )}
            </TabPanel>
            <div className="mt-4 rounded-2xl border border-primary/40 bg-surface-sunken/60 p-4">
              <h2 className="font-display text-lg font-semibold text-content">Class info</h2>
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <MarkStars score={profile.progression.badgeCount > 0 ? Math.min(100, profile.progression.badgeCount * 20) : undefined} />
                <p className="text-sm text-content-muted">
                  {profile.progression.badgeCount === 0
                    ? 'No badges yet. A Preceptor awards them.'
                    : `${profile.progression.badgeCount} badge${profile.progression.badgeCount === 1 ? '' : 's'}`}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {editing && isOwnProfile && (
        <ProfileEditor
          profile={profile}
          subjects={subjects}
          onSaved={(updated) => {
            setProfile(updated);
            setEditing(false);
          }}
        />
      )}

      {!scholar && (
        <div className="grid gap-3 sm:grid-cols-4">
          <StatCard label="Scholars" value={preceptor.interactionStats.scholarsInteractedWith} />
          <StatCard label="Reviewed" value={preceptor.interactionStats.submissionsReviewed} />
          <StatCard label="Feedback" value={preceptor.interactionStats.feedbackProvided} />
          <StatCard label="Badges given" value={preceptor.interactionStats.badgesAwarded} />
        </div>
      )}
      {scholar && profile.interestedSubjectIds.length > 0 && (
        <p className="text-sm text-content-muted">
          Wants to explore: {subjectNames(profile.interestedSubjectIds).join(', ')}
        </p>
      )}
      {!scholar && preceptor.knowledgeAreas.length > 0 && (
        <p className="text-sm text-content-muted">Knowledge areas: {preceptor.knowledgeAreas.join(', ')}</p>
      )}

      {isOwnProfile && (
        <p className="text-sm text-content-muted">
          Your profile is visible to: {VISIBILITY_LABELS[profile.visibility] ?? profile.visibility}.
        </p>
      )}
    </div>
  );
}
