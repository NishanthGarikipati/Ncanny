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
import { updatePreceptorProfileSchema, updateScholarProfileSchema } from '@ncanny/validation';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { SubjectChips } from '../components/SubjectChips';
import { Banner, Button, Card, Chip, Muted, Screen, TextField } from '../components/ui';
import { getApiClient } from '../lib/api';
import { useAuthStore } from '../lib/auth-store';
import { FORM_ERROR, parseForm, toFormErrors, type FieldErrors } from '../lib/form';
import { useTheme } from '../theme/theme';

const VISIBILITY_OPTIONS: { value: string; label: string }[] = [
  { value: Visibility.SCHOOL, label: 'My school' },
  { value: Visibility.CONNECTIONS, label: 'Connections' },
  { value: Visibility.PRIVATE, label: 'Only me' },
  { value: Visibility.PUBLIC, label: 'Anyone' },
];

const CONTENT_TABS = ['Paintings', 'Essays', 'Elocution', 'Study activities'] as const;

function isScholar(profile: AnyProfile): profile is ScholarProfile {
  return profile.role === UserRole.SCHOLAR;
}

/**
 * Renders a Scholar or Preceptor profile. Editing is only offered for the
 * signed-in user's own profile, and the API additionally refuses any other
 * update server-side.
 */
export function ProfileScreen({ cannyId }: { cannyId: string }) {
  const colors = useTheme();
  const router = useRouter();
  const viewer = useAuthStore((state) => state.user);
  const setUser = useAuthStore((state) => state.setUser);
  const [profile, setProfile] = useState<AnyProfile | null>(null);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [tab, setTab] = useState<(typeof CONTENT_TABS)[number]>('Paintings');
  const [lookup, setLookup] = useState('');
  const [lookupError, setLookupError] = useState<string | null>(null);

  const own = viewer?.cannyId === cannyId;

  const load = useCallback(async () => {
    setError(null);
    const client = getApiClient();
    const scholar = cannyId.startsWith('NCS-');
    try {
      const loaded = own
        ? await (scholar ? client.scholars.me() : client.preceptors.me())
        : await (scholar ? client.scholars.byCannyId(cannyId) : client.preceptors.byCannyId(cannyId));
      setProfile(loaded);
    } catch (cause) {
      setError(
        cause instanceof ApiError && cause.status === 404
          ? 'No profile is available for that Canny ID.'
          : 'Could not load this profile. Please try again.',
      );
    }
  }, [cannyId, own]);

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
    return (
      <Screen title="Profile">
        <Banner tone="danger" message={error} />
      </Screen>
    );
  }

  if (!profile) {
    return (
      <Screen title="Profile">
        <Muted>Loading profile</Muted>
      </Screen>
    );
  }

  const scholar = isScholar(profile);
  const preceptor = profile as PreceptorProfile;
  const names = (ids: string[]) =>
    ids
      .map((id) => subjects.find((subject) => subject.id === id)?.name)
      .filter((name): name is string => Boolean(name));

  return (
    <Screen>
      <Text accessibilityRole="header" style={{ color: colors.text, fontSize: 28, fontWeight: '700' }}>
        {profile.fullName}
      </Text>
      <Text style={{ color: colors.primary, fontSize: 16, fontWeight: '600' }}>{profile.cannyId}</Text>
      <Muted>
        {scholar
          ? [GRADE_LABELS[profile.grade], profile.section ? `Section ${profile.section}` : null]
              .filter(Boolean)
              .join(' · ')
          : (preceptor.preceptorRole ?? 'Preceptor')}
        {` · ${profile.school.name}`}
      </Muted>
      {profile.bio ? <Text style={{ color: colors.text, fontSize: 15 }}>{profile.bio}</Text> : null}

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        <Stat label="Level" value={String(profile.progression.level)} />
        <Stat label="XP" value={String(profile.progression.xp)} />
        <Stat label="Badges" value={String(profile.progression.badgeCount)} />
        <Stat label="Streak" value={`${profile.progression.streakDays}d`} />
      </View>

      {own ? (
        <View style={{ gap: 8 }}>
          <Button
            label={editing ? 'Cancel editing' : 'Edit profile'}
            variant="secondary"
            onPress={() => setEditing((value) => !value)}
          />
          <Button label="Settings" variant="ghost" onPress={() => router.push('/settings')} />
        </View>
      ) : null}

      {editing && own ? (
        <ProfileEditor
          profile={profile}
          subjects={subjects}
          onSaved={(updated) => {
            setProfile(updated);
            setEditing(false);
            if (viewer) {
              setUser({ ...viewer, fullName: updated.fullName, avatarUrl: updated.avatarUrl });
            }
          }}
        />
      ) : null}

      <Card>
        <Text style={{ color: colors.text, fontWeight: '700' }}>
          {scholar ? 'Subjects' : 'Subjects taught'}
        </Text>
        <Muted>
          {(scholar ? names(profile.subjectIds) : names(preceptor.teachingSubjectIds)).join(', ') ||
            'No subjects selected yet.'}
        </Muted>
        {scholar && profile.interestedSubjectIds.length > 0 ? (
          <Muted>Wants to explore: {names(profile.interestedSubjectIds).join(', ')}</Muted>
        ) : null}
        {!scholar && preceptor.knowledgeAreas.length > 0 ? (
          <Muted>Knowledge areas: {preceptor.knowledgeAreas.join(', ')}</Muted>
        ) : null}
      </Card>

      <Card>
        <Text style={{ color: colors.text, fontWeight: '700' }}>Work</Text>
        <Muted>Creating and sharing work opens in the next milestone. Nothing is here yet.</Muted>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {CONTENT_TABS.map((item) => (
            <Chip key={item} label={item} selected={tab === item} onPress={() => setTab(item)} />
          ))}
        </View>
        <Muted>No {tab.toLowerCase()} yet.</Muted>
      </Card>

      {own ? (
        <Card>
          <Text style={{ color: colors.text, fontWeight: '700' }}>Look up a Canny ID</Text>
          <Muted>Profiles you are not allowed to see are reported as not found.</Muted>
          <TextField
            label="Canny ID"
            value={lookup}
            onChangeText={setLookup}
            autoCapitalize="characters"
            error={lookupError ?? undefined}
          />
          <Button
            label="Open profile"
            variant="secondary"
            onPress={() => {
              const id = lookup.trim().toUpperCase();
              if (!/^NC[SP]-\d{6}$/.test(id)) {
                setLookupError('Enter a Canny ID like NCS-048213.');
                return;
              }
              setLookupError(null);
              router.push(`/people/${id}`);
            }}
          />
        </Card>
      ) : null}
    </Screen>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  const colors = useTheme();
  return (
    <View
      style={{
        minWidth: 72,
        borderRadius: 12,
        backgroundColor: colors.surfaceRaised,
        borderWidth: 1,
        borderColor: colors.border,
        padding: 10,
      }}
    >
      <Text style={{ color: colors.textMuted, fontSize: 12 }}>{label}</Text>
      <Text style={{ color: colors.text, fontSize: 18, fontWeight: '700' }}>{value}</Text>
    </View>
  );
}

function ProfileEditor({
  profile,
  subjects,
  onSaved,
}: {
  profile: AnyProfile;
  subjects: Subject[];
  onSaved: (profile: AnyProfile) => void;
}) {
  const scholar = profile.role === UserRole.SCHOLAR;
  const [fullName, setFullName] = useState(profile.fullName);
  const [bio, setBio] = useState(profile.bio ?? '');
  const [section, setSection] = useState(scholar ? ((profile as ScholarProfile).section ?? '') : '');
  const [preceptorRole, setPreceptorRole] = useState(
    scholar ? '' : ((profile as PreceptorProfile).preceptorRole ?? ''),
  );
  const [subjectIds, setSubjectIds] = useState<string[]>(
    scholar ? (profile as ScholarProfile).subjectIds : (profile as PreceptorProfile).teachingSubjectIds,
  );
  const [visibility, setVisibility] = useState<string>(profile.visibility);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitting, setSubmitting] = useState(false);

  const save = async () => {
    const client = getApiClient();
    if (scholar) {
      const parsed = parseForm(updateScholarProfileSchema, {
        fullName,
        bio,
        grade: (profile as ScholarProfile).grade,
        section,
        subjectIds,
        interestedSubjectIds: (profile as ScholarProfile).interestedSubjectIds,
        visibility,
      });
      if (!parsed.ok) {
        setErrors(parsed.errors);
        return;
      }
      setSubmitting(true);
      try {
        onSaved(await client.scholars.updateMe(parsed.data));
      } catch (error) {
        setErrors(toFormErrors(error));
      } finally {
        setSubmitting(false);
      }
      return;
    }

    const parsed = parseForm(updatePreceptorProfileSchema, {
      fullName,
      bio,
      preceptorRole,
      teachingSubjectIds: subjectIds,
      knowledgeAreas: (profile as PreceptorProfile).knowledgeAreas,
      visibility,
    });
    if (!parsed.ok) {
      setErrors(parsed.errors);
      return;
    }
    setSubmitting(true);
    try {
      onSaved(await client.preceptors.updateMe(parsed.data));
    } catch (error) {
      setErrors(toFormErrors(error));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card>
      {errors[FORM_ERROR] ? <Banner tone="danger" message={errors[FORM_ERROR]} /> : null}
      <TextField label="Full name" value={fullName} onChangeText={setFullName} error={errors.fullName} />
      <TextField
        label="About you"
        hint="Do not include your address or phone number."
        value={bio}
        onChangeText={setBio}
        multiline
        error={errors.bio}
      />
      {scholar ? (
        <TextField label="Section" value={section} onChangeText={setSection} error={errors.section} />
      ) : (
        <TextField
          label="Role at school"
          value={preceptorRole}
          onChangeText={setPreceptorRole}
          error={errors.preceptorRole}
        />
      )}
      <SubjectChips
        legend={scholar ? 'Subjects you are studying' : 'Subjects you teach'}
        subjects={subjects}
        selected={subjectIds}
        onChange={setSubjectIds}
        error={errors.subjectIds ?? errors.teachingSubjectIds}
      />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {VISIBILITY_OPTIONS.map((option) => (
          <Chip
            key={option.value}
            label={option.label}
            selected={visibility === option.value}
            onPress={() => setVisibility(option.value)}
          />
        ))}
      </View>
      {errors.visibility ? <Banner tone="danger" message={errors.visibility} /> : null}
      <Button label="Save changes" loading={submitting} onPress={() => void save()} />
    </Card>
  );
}
