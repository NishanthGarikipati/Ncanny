'use client';

import { ApiError } from '@ncanny/api-client';
import {
  GRADE_LABELS,
  UserRole,
  Visibility,
  type AnyProfile,
  type PreceptorProfile,
  type ScholarProfile,
  type Subject,
} from '@ncanny/types';
import {
  Alert,
  Badge,
  Button,
  Card,
  CardHeader,
  EmptyState,
  LoadingState,
  ProfileHeader,
  StatCard,
  TabPanel,
  Tabs,
} from '@ncanny/ui';
import { useCallback, useEffect, useState } from 'react';
import { getApiClient } from '../../lib/api';
import { useAuthStore } from '../../lib/auth-store';
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

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <ProfileHeader
        fullName={profile.fullName}
        cannyId={profile.cannyId}
        avatarUrl={profile.avatarUrl}
        subtitle={
          scholar
            ? [GRADE_LABELS[profile.grade], profile.section && `Section ${profile.section}`]
                .filter(Boolean)
                .join(' · ')
            : preceptor.preceptorRole
        }
        schoolName={profile.school.name}
        bio={profile.bio}
        level={profile.progression.level}
        actions={
          isOwnProfile ? (
            <Button variant="secondary" onClick={() => setEditing((value) => !value)}>
              {editing ? 'Cancel' : 'Edit profile'}
            </Button>
          ) : undefined
        }
        stats={
          <div className="grid gap-3 sm:grid-cols-4">
            <StatCard label="XP" value={profile.progression.xp} />
            <StatCard label="Level" value={profile.progression.level} />
            <StatCard label="Badges" value={profile.progression.badgeCount} />
            <StatCard label="Streak" value={`${profile.progression.streakDays} days`} />
          </div>
        }
      />

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

      <Card>
        <CardHeader title={scholar ? 'Subjects' : 'Subjects taught'} />
        <div className="mt-3 flex flex-wrap gap-2">
          {(scholar
            ? subjectNames(profile.subjectIds)
            : subjectNames(preceptor.teachingSubjectIds)
          ).map((name) => (
            <Badge key={name} tone="primary">
              {name}
            </Badge>
          ))}
          {(scholar ? profile.subjectIds : preceptor.teachingSubjectIds).length === 0 && (
            <p className="text-sm text-content-muted">No subjects selected yet.</p>
          )}
        </div>

        {scholar && profile.interestedSubjectIds.length > 0 && (
          <>
            <h3 className="mt-5 text-sm font-medium text-content">Wants to explore</h3>
            <div className="mt-2 flex flex-wrap gap-2">
              {subjectNames(profile.interestedSubjectIds).map((name) => (
                <Badge key={name} tone="accent">
                  {name}
                </Badge>
              ))}
            </div>
          </>
        )}

        {!scholar && preceptor.knowledgeAreas.length > 0 && (
          <>
            <h3 className="mt-5 text-sm font-medium text-content">Knowledge areas</h3>
            <div className="mt-2 flex flex-wrap gap-2">
              {preceptor.knowledgeAreas.map((area) => (
                <Badge key={area}>{area}</Badge>
              ))}
            </div>
          </>
        )}
      </Card>

      <Card>
        <CardHeader
          title={scholar ? 'Work created' : 'Reviewing'}
          description="Publishing work opens in the next milestone. These shelves stay empty until then."
        />
        <div className="mt-4">
          <Tabs
            aria-label="Work"
            activeId={contentTab}
            onChange={setContentTab}
            items={[
              { id: 'paintings', label: 'Paintings', count: scholar ? profile.contentStats.paintings : 0 },
              { id: 'essays', label: 'Essays', count: scholar ? profile.contentStats.essays : 0 },
              { id: 'elocution', label: 'Elocution', count: scholar ? profile.contentStats.elocutions : 0 },
              {
                id: 'study',
                label: 'Study activities',
                count: scholar ? profile.contentStats.studyActivities : 0,
              },
            ]}
          />
          <TabPanel id={contentTab} activeId={contentTab}>
            <EmptyState
              title={`No ${contentTab === 'study' ? 'study activities' : contentTab} yet`}
              description={
                scholar
                  ? 'When you publish work it will appear on this shelf, visible according to the setting above.'
                  : 'Reviews and uploaded teaching material will appear here once the content milestone ships.'
              }
            />
          </TabPanel>
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-4">
          {scholar ? (
            <>
              <StatCard label="Paintings" value={profile.contentStats.paintings} />
              <StatCard label="Essays" value={profile.contentStats.essays} />
              <StatCard label="Elocutions" value={profile.contentStats.elocutions} />
              <StatCard label="Study activities" value={profile.contentStats.studyActivities} />
            </>
          ) : (
            <>
              <StatCard label="Scholars" value={preceptor.interactionStats.scholarsInteractedWith} />
              <StatCard label="Reviewed" value={preceptor.interactionStats.submissionsReviewed} />
              <StatCard label="Feedback" value={preceptor.interactionStats.feedbackProvided} />
              <StatCard label="Badges given" value={preceptor.interactionStats.badgesAwarded} />
            </>
          )}
        </div>
      </Card>

      {isOwnProfile && (
        <p className="text-sm text-content-muted">
          Your profile is visible to: {VISIBILITY_LABELS[profile.visibility] ?? profile.visibility}.
        </p>
      )}
    </div>
  );
}
