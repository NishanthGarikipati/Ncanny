'use client';

import {
  ALL_GRADE_LEVELS,
  GRADE_LABELS,
  UserRole,
  Visibility,
  type AnyProfile,
  type PreceptorProfile,
  type ScholarProfile,
  type Subject,
} from '@ncanny/types';
import { Alert, Button, Card, CardHeader, FormField, Input, Select, Textarea } from '@ncanny/ui';
import { updatePreceptorProfileSchema, updateScholarProfileSchema } from '@ncanny/validation';
import { useState, type FormEvent } from 'react';
import { getApiClient } from '../../lib/api';
import { useAuthStore } from '../../lib/auth-store';
import { FORM_ERROR, parseForm, toFormErrors, type FieldErrors } from '../../lib/form';
import { SubjectPicker } from '../auth/SubjectPicker';

const VISIBILITY_OPTIONS = [
  { value: Visibility.SCHOOL, label: 'My school only' },
  { value: Visibility.CONNECTIONS, label: 'My connections' },
  { value: Visibility.PRIVATE, label: 'Only me' },
  { value: Visibility.PUBLIC, label: 'Anyone on Ncanny' },
];

interface ProfileEditorProps {
  profile: AnyProfile;
  subjects: Subject[];
  onSaved: (profile: AnyProfile) => void;
}

/**
 * Edits only the signed-in user's own profile. There is no path here to edit
 * anyone else: the API exposes `/me` endpoints only, and enforces that itself.
 */
export function ProfileEditor({ profile, subjects, onSaved }: ProfileEditorProps) {
  const setUser = useAuthStore((state) => state.setUser);
  const viewer = useAuthStore((state) => state.user);
  const scholar = profile.role === UserRole.SCHOLAR;

  const [subjectIds, setSubjectIds] = useState<string[]>(
    scholar
      ? (profile as ScholarProfile).subjectIds
      : (profile as PreceptorProfile).teachingSubjectIds,
  );
  const [interestedSubjectIds, setInterestedSubjectIds] = useState<string[]>(
    scholar ? (profile as ScholarProfile).interestedSubjectIds : [],
  );
  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitting, setSubmitting] = useState(false);

  const save = async (load: () => Promise<AnyProfile>) => {
    setErrors({});
    setSubmitting(true);
    try {
      const updated = await load();
      // The shell shows the name from the session, so keep the two in step.
      if (viewer) {
        setUser({ ...viewer, fullName: updated.fullName, avatarUrl: updated.avatarUrl });
      }
      onSaved(updated);
    } catch (error) {
      setErrors(toFormErrors(error));
    } finally {
      setSubmitting(false);
    }
  };

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const client = getApiClient();
    const bio = String(form.get('bio') ?? '').trim();

    if (scholar) {
      const parsed = parseForm(updateScholarProfileSchema, {
        fullName: form.get('fullName'),
        bio,
        grade: form.get('grade'),
        section: String(form.get('section') ?? '').trim(),
        subjectIds,
        interestedSubjectIds,
        visibility: form.get('visibility'),
      });
      if (!parsed.ok) {
        setErrors(parsed.errors);
        return;
      }
      await save(() => client.scholars.updateMe(parsed.data));
      return;
    }

    const parsed = parseForm(updatePreceptorProfileSchema, {
      fullName: form.get('fullName'),
      bio,
      preceptorRole: String(form.get('preceptorRole') ?? '').trim(),
      teachingSubjectIds: subjectIds,
      knowledgeAreas: String(form.get('knowledgeAreas') ?? '')
        .split(',')
        .map((value) => value.trim())
        .filter((value) => value.length > 0),
      visibility: form.get('visibility'),
    });
    if (!parsed.ok) {
      setErrors(parsed.errors);
      return;
    }
    await save(() => client.preceptors.updateMe(parsed.data));
  };

  return (
    <Card>
      <CardHeader
        title="Edit profile"
        description="Only you can change your profile. Your school and Canny ID are fixed."
      />

      <form onSubmit={onSubmit} noValidate className="mt-4 flex flex-col gap-5">
        {errors[FORM_ERROR] && <Alert tone="danger">{errors[FORM_ERROR]}</Alert>}

        <FormField label="Full name" error={errors.fullName} required>
          {({ id, describedBy, invalid }) => (
            <Input
              id={id}
              name="fullName"
              defaultValue={profile.fullName}
              aria-describedby={describedBy}
              invalid={invalid}
            />
          )}
        </FormField>

        <FormField
          label="About you"
          hint="Up to 400 characters. Do not include your address, phone number or other contact details."
          error={errors.bio}
        >
          {({ id, describedBy, invalid }) => (
            <Textarea
              id={id}
              name="bio"
              defaultValue={profile.bio ?? ''}
              maxLength={400}
              aria-describedby={describedBy}
              invalid={invalid}
            />
          )}
        </FormField>

        {scholar ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Grade" error={errors.grade}>
              {({ id, describedBy, invalid }) => (
                <Select
                  id={id}
                  name="grade"
                  defaultValue={(profile as ScholarProfile).grade}
                  aria-describedby={describedBy}
                  invalid={invalid}
                  options={ALL_GRADE_LEVELS.map((grade) => ({
                    value: grade,
                    label: GRADE_LABELS[grade],
                  }))}
                />
              )}
            </FormField>

            <FormField label="Section" error={errors.section}>
              {({ id, describedBy, invalid }) => (
                <Input
                  id={id}
                  name="section"
                  defaultValue={(profile as ScholarProfile).section ?? ''}
                  aria-describedby={describedBy}
                  invalid={invalid}
                />
              )}
            </FormField>
          </div>
        ) : (
          <FormField label="Role at school" error={errors.preceptorRole}>
            {({ id, describedBy, invalid }) => (
              <Input
                id={id}
                name="preceptorRole"
                defaultValue={(profile as PreceptorProfile).preceptorRole ?? ''}
                aria-describedby={describedBy}
                invalid={invalid}
              />
            )}
          </FormField>
        )}

        <SubjectPicker
          id="edit-subjects"
          legend={scholar ? 'Subjects you are studying' : 'Subjects you teach'}
          subjects={subjects}
          selected={subjectIds}
          onChange={setSubjectIds}
          error={errors.subjectIds ?? errors.teachingSubjectIds}
        />

        {scholar ? (
          <SubjectPicker
            id="edit-interests"
            legend="Subjects you want to explore"
            subjects={subjects}
            selected={interestedSubjectIds}
            onChange={setInterestedSubjectIds}
            error={errors.interestedSubjectIds}
          />
        ) : (
          <FormField
            label="Knowledge areas"
            hint="Separate with commas."
            error={errors.knowledgeAreas}
          >
            {({ id, describedBy, invalid }) => (
              <Input
                id={id}
                name="knowledgeAreas"
                defaultValue={(profile as PreceptorProfile).knowledgeAreas.join(', ')}
                aria-describedby={describedBy}
                invalid={invalid}
              />
            )}
          </FormField>
        )}

        <FormField
          label="Who can see your profile"
          hint="Scholars default to their school. Widen this only if you want to."
          error={errors.visibility}
        >
          {({ id, describedBy, invalid }) => (
            <Select
              id={id}
              name="visibility"
              defaultValue={profile.visibility}
              aria-describedby={describedBy}
              invalid={invalid}
              options={VISIBILITY_OPTIONS}
            />
          )}
        </FormField>

        <Button type="submit" loading={submitting}>
          Save changes
        </Button>
      </form>
    </Card>
  );
}
