import {
  ContentType,
  PRECEPTOR_CONTENT_TYPES,
  SCHOLAR_CONTENT_TYPES,
  UserRole,
  Visibility,
  type Subject,
} from '@ncanny/types';
import { createWorkSchema } from '@ncanny/validation';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { Banner, Button, Card, Chip, Muted, Screen, TextField } from '../components/ui';
import { getApiClient } from '../lib/api';
import { useAuthStore } from '../lib/auth-store';
import { FORM_ERROR, parseForm, toFormErrors, type FieldErrors } from '../lib/form';
import { useTheme } from '../theme/theme';

const LABELS: Record<string, string> = {
  [ContentType.ESSAY]: 'Essay',
  [ContentType.STUDY_ACTIVITY]: 'Study activity',
  [ContentType.ELOCUTION]: 'Elocution transcript',
  [ContentType.TEACHER_PRESENTATION]: 'Teaching notes',
};

/** Writing only. Paintings and audio are published on the web, where a file can be attached. */
const MOBILE_TYPES = [
  ContentType.ESSAY,
  ContentType.STUDY_ACTIVITY,
  ContentType.ELOCUTION,
  ContentType.TEACHER_PRESENTATION,
] as const;

export function CreateWorkScreen() {
  const router = useRouter();
  const colors = useTheme();
  const user = useAuthStore((state) => state.user);
  const allowed = user?.role === UserRole.PRECEPTOR ? PRECEPTOR_CONTENT_TYPES : SCHOLAR_CONTENT_TYPES;
  const types = MOBILE_TYPES.filter((type) => (allowed as readonly string[]).includes(type));
  const [type, setType] = useState<string>(types[0] ?? ContentType.ESSAY);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [visibility, setVisibility] = useState<string>(Visibility.SCHOOL);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    getApiClient()
      .subjects.list({ signal: controller.signal })
      .then(setSubjects)
      .catch(() => setSubjects([]));
    return () => controller.abort();
  }, []);

  const publish = async () => {
    setSubmitting(true);
    setErrors({});
    const parsed = parseForm(createWorkSchema, {
      type,
      title,
      subjectId,
      visibility,
      ...(body.trim() ? { body: body.trim() } : {}),
    });
    if (!parsed.ok) {
      setErrors(parsed.errors);
      setSubmitting(false);
      return;
    }
    try {
      const created = await getApiClient().content.create(parsed.data);
      router.replace(`/work/${created.id}`);
    } catch (error) {
      setErrors(toFormErrors(error));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Screen title="Create" subtitle="The hall is on the web. This screen publishes writing for your school.">
      {errors[FORM_ERROR] ? <Banner tone="danger" message={errors[FORM_ERROR]} /> : null}
      <Card>
        <Text style={{ color: colors.text, fontWeight: '600' }}>Kind of work</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {types.map((value) => (
            <Chip
              key={value}
              label={LABELS[value] ?? value}
              selected={type === value}
              onPress={() => setType(value)}
            />
          ))}
        </View>
        {errors.type ? <Banner tone="danger" message={errors.type} /> : null}
        <TextField label="Title" value={title} onChangeText={setTitle} error={errors.title} />
        <Text style={{ color: colors.text, fontWeight: '600' }}>Subject</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {subjects.map((subject) => (
            <Chip
              key={subject.id}
              label={subject.name}
              selected={subjectId === subject.id}
              onPress={() => setSubjectId(subject.id)}
            />
          ))}
        </View>
        {errors.subjectId ? <Banner tone="danger" message={errors.subjectId} /> : null}
        <TextField
          label={type === ContentType.ELOCUTION ? 'Transcript' : 'Writing'}
          value={body}
          onChangeText={setBody}
          error={errors.body}
          multiline
          style={{ minHeight: 140, textAlignVertical: 'top' }}
        />
        <Text style={{ color: colors.text, fontWeight: '600' }}>Who can see this</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          <Chip
            label="My school"
            selected={visibility === Visibility.SCHOOL}
            onPress={() => setVisibility(Visibility.SCHOOL)}
          />
          <Chip
            label="Only me"
            selected={visibility === Visibility.PRIVATE}
            onPress={() => setVisibility(Visibility.PRIVATE)}
          />
          <Chip
            label="Anyone on Ncanny"
            selected={visibility === Visibility.PUBLIC}
            onPress={() => setVisibility(Visibility.PUBLIC)}
          />
        </View>
        <Muted>Paintings and audio are published from the web app.</Muted>
        <Button label="Publish" loading={submitting} onPress={() => void publish()} />
      </Card>
    </Screen>
  );
}
