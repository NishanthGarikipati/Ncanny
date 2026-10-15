'use client';

import {
  ContentType,
  PRECEPTOR_CONTENT_TYPES,
  SCHOLAR_CONTENT_TYPES,
  UserRole,
  Visibility,
  type Subject,
} from '@ncanny/types';
import { Alert, Button, FormField, Input, Select, Textarea } from '@ncanny/ui';
import { createWorkSchema } from '@ncanny/validation';
import { useRouter } from 'next/navigation';
import { useEffect, useState, type FormEvent } from 'react';
import { getApiClient } from '../../lib/api';
import { useAuthStore } from '../../lib/auth-store';
import { FORM_ERROR, parseForm, toFormErrors, type FieldErrors } from '../../lib/form';

const LABELS: Record<string, { title: string; station: string }> = {
  [ContentType.ESSAY]: { title: 'Essay', station: 'Library' },
  [ContentType.PAINTING]: { title: 'Painting', station: 'Studio' },
  [ContentType.ELOCUTION]: { title: 'Elocution', station: 'Stage' },
  [ContentType.STUDY_ACTIVITY]: { title: 'Study activity', station: 'Laboratory' },
  [ContentType.TEACHER_VIDEO]: { title: 'Teaching audio', station: 'Faculty' },
  [ContentType.TEACHER_PRESENTATION]: { title: 'Teaching notes', station: 'Faculty' },
};

export function CreateWork() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const types = user?.role === UserRole.PRECEPTOR ? PRECEPTOR_CONTENT_TYPES : SCHOLAR_CONTENT_TYPES;
  const [type, setType] = useState<string>(types[0] ?? ContentType.ESSAY);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [file, setFile] = useState<File | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    getApiClient()
      .subjects.list({ signal: controller.signal })
      .then(setSubjects)
      .catch(() => setSubjects([]));
    return () => controller.abort();
  }, []);

  const needsFile = type === ContentType.PAINTING || type === ContentType.ELOCUTION || type === ContentType.TEACHER_VIDEO;

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setSubmitting(true);
    setErrors({});
    try {
      let mediaId: string | undefined;
      if (file && needsFile) {
        const dataBase64 = await fileToBase64(file);
        const mimeType = normaliseMime(file.type);
        if (!mimeType) {
          setErrors({ mediaId: 'Use a PNG, JPEG, WebP or a common audio file.' });
          return;
        }
        const stored = await getApiClient().media.upload({ mimeType, dataBase64 });
        mediaId = stored.id;
      }
      const body = String(form.get('body') ?? '').trim();
      const parsed = parseForm(createWorkSchema, {
        type,
        title: form.get('title'),
        subjectId: form.get('subjectId'),
        visibility: form.get('visibility'),
        ...(body ? { body } : {}),
        ...(mediaId ? { mediaId } : {}),
      });
      if (!parsed.ok) {
        setErrors(parsed.errors);
        return;
      }
      const created = await getApiClient().content.create(parsed.data);
      router.push(`/work/${created.id}`);
    } catch (error) {
      setErrors(toFormErrors(error));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="hud-frame p-4 sm:p-5">
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
        {errors[FORM_ERROR] && <Alert tone="danger">{errors[FORM_ERROR]}</Alert>}
        <fieldset>
          <legend className="text-sm font-medium text-content">Kind of work</legend>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {types.map((value) => (
              <button
                key={value}
                type="button"
                aria-pressed={type === value}
                onClick={() => setType(value)}
                className={`min-h-20 rounded-xl border px-3 py-2 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                  type === value
                    ? 'border-primary bg-primary-soft text-content shadow-hud'
                    : 'border-border bg-surface text-content-muted'
                }`}
              >
                <span className="kicker">{LABELS[value]?.station ?? 'Station'}</span>
                <span className="mt-1 block text-sm font-semibold">{LABELS[value]?.title ?? value}</span>
              </button>
            ))}
          </div>
          {errors.type && <p className="mt-1 text-sm text-danger">{errors.type}</p>}
        </fieldset>
        <FormField label="Title" error={errors.title} required>
          {({ id, describedBy, invalid }) => (
            <Input id={id} name="title" aria-describedby={describedBy} invalid={invalid} />
          )}
        </FormField>
        <FormField label="Subject" error={errors.subjectId} required>
          {({ id, describedBy, invalid }) => (
            <Select
              id={id}
              name="subjectId"
              defaultValue=""
              placeholder="Choose a subject"
              aria-describedby={describedBy}
              invalid={invalid}
              options={subjects.map((subject) => ({ value: subject.id, label: subject.name }))}
            />
          )}
        </FormField>
        <FormField
          label={type === ContentType.ELOCUTION ? 'Transcript' : 'Writing'}
          hint={needsFile ? 'Optional when you attach a file, except for essays and study activities.' : undefined}
          error={errors.body}
        >
          {({ id, describedBy, invalid }) => (
            <Textarea id={id} name="body" aria-describedby={describedBy} invalid={invalid} />
          )}
        </FormField>
        {needsFile && (
          <FormField label="File" hint="Images: PNG, JPEG or WebP. Audio: up to 8 MB." error={errors.mediaId}>
            {({ id }) => (
              <input
                id={id}
                type="file"
                accept={type === ContentType.PAINTING ? 'image/png,image/jpeg,image/webp' : 'audio/*'}
                className="text-sm text-content"
                onChange={(event) => setFile(event.target.files?.[0] ?? null)}
              />
            )}
          </FormField>
        )}
        <FormField label="Who can see this" error={errors.visibility}>
          {({ id, describedBy, invalid }) => (
            <Select
              id={id}
              name="visibility"
              defaultValue={Visibility.SCHOOL}
              aria-describedby={describedBy}
              invalid={invalid}
              options={[
                { value: Visibility.SCHOOL, label: 'My school' },
                { value: Visibility.PRIVATE, label: 'Only me' },
                { value: Visibility.PUBLIC, label: 'Anyone on Ncanny' },
              ]}
            />
          )}
        </FormField>
        <Button type="submit" loading={submitting}>
          Publish to the campus
        </Button>
      </form>
    </div>
  );
}

const ACCEPTED_MIME = [
  'image/png',
  'image/jpeg',
  'image/webp',
  'audio/webm',
  'audio/mpeg',
  'audio/wav',
  'audio/mp4',
] as const;

type AcceptedMime = (typeof ACCEPTED_MIME)[number];

function normaliseMime(value: string): AcceptedMime | null {
  const mime = value === 'image/jpg' ? 'image/jpeg' : value;
  return ACCEPTED_MIME.find((candidate) => candidate === mime) ?? null;
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const value = String(reader.result ?? '');
      const comma = value.indexOf(',');
      resolve(comma >= 0 ? value.slice(comma + 1) : value);
    };
    reader.onerror = () => reject(new Error('Could not read the file'));
    reader.readAsDataURL(file);
  });
}
