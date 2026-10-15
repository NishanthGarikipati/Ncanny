'use client';

import { ALL_GRADE_LEVELS, AVATAR_PRESETS, GRADE_LABELS, UserRole, type AvatarPreset, type Subject } from '@ncanny/types';
import { Alert, Button, Card, FormField, Input, Select } from '@ncanny/ui';
import { registerPreceptorSchema, registerScholarSchema } from '@ncanny/validation';
import { useRouter } from 'next/navigation';
import { useEffect, useState, type FormEvent } from 'react';
import { getApiClient } from '../../lib/api';
import { useAuthStore } from '../../lib/auth-store';
import { FORM_ERROR, parseForm, toFormErrors, type FieldErrors } from '../../lib/form';
import { AVATAR_PRESET_LABELS, Portrait } from '../neon';
import { SchoolPicker, type SchoolSelection } from './SchoolPicker';
import { SubjectPicker } from './SubjectPicker';

type SelfRegisterRole = typeof UserRole.SCHOLAR | typeof UserRole.PRECEPTOR;

export function RegisterForm() {
  const [role, setRole] = useState<SelfRegisterRole | null>(null);
  const [avatarPreset, setAvatarPreset] = useState<AvatarPreset>('crest');

  if (!role) {
    return (
      <div className="flex flex-col gap-4">
        <AvatarChooser value={avatarPreset} onChange={setAvatarPreset} />
        <RoleChooser onChoose={setRole} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <Button variant="ghost" size="sm" className="self-start" onClick={() => setRole(null)}>
        Change role
      </Button>
      {role === UserRole.SCHOLAR ? (
        <ScholarForm avatarPreset={avatarPreset} />
      ) : (
        <PreceptorForm avatarPreset={avatarPreset} />
      )}
    </div>
  );
}

function AvatarChooser({
  value,
  onChange,
}: {
  value: AvatarPreset;
  onChange: (preset: AvatarPreset) => void;
}) {
  return (
    <fieldset className="hud-frame p-4">
      <legend className="neon-title px-3 text-base">Create Avatar</legend>
      <div className="mt-3 grid grid-cols-5 gap-2">
        {AVATAR_PRESETS.map((preset) => (
          <button
            key={preset}
            type="button"
            aria-pressed={value === preset}
            aria-label={AVATAR_PRESET_LABELS[preset]}
            onClick={() => onChange(preset)}
            className="holo-pad flex flex-col items-center gap-1 p-2 text-xs font-semibold text-content"
          >
            <Portrait name={AVATAR_PRESET_LABELS[preset]} preset={preset} size="md" />
            {AVATAR_PRESET_LABELS[preset]}
          </button>
        ))}
      </div>
    </fieldset>
  );
}

function RoleChooser({ onChoose }: { onChoose: (role: SelfRegisterRole) => void }) {
  const options = [
    {
      role: UserRole.SCHOLAR,
      title: 'I am a Scholar',
      description:
        'A school student. Create paintings, essays, elocutions and study activities, and earn recognition for them.',
    },
    {
      role: UserRole.PRECEPTOR,
      title: 'I am a Preceptor',
      description:
        'A teacher or educator. Review Scholar work, give feedback and marks, and award badges.',
    },
  ] as const;

  return (
    <div className="flex flex-col gap-4">
    <p className="text-sm font-semibold text-content">Select role</p>
    <div className="grid gap-4 sm:grid-cols-2">
      {options.map((option) => (
        <Card key={option.role} tone="raised" padded={false} className={option.role === UserRole.SCHOLAR ? 'border-2 border-primary shadow-hud' : 'border-2 border-accent shadow-hud'}>
          <button
            type="button"
            onClick={() => onChoose(option.role)}
            className="flex h-full w-full flex-col items-start gap-2 rounded-lg p-5 text-left hover:bg-surface-sunken focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <span className="font-display text-lg font-semibold text-content">{option.title}</span>
            <span className="text-sm text-content-muted">{option.description}</span>
          </button>
        </Card>
      ))}
    </div>
    </div>
  );
}

function useSubjects() {
  const [subjects, setSubjects] = useState<Subject[]>([]);

  useEffect(() => {
    const controller = new AbortController();
    getApiClient()
      .subjects.list({ signal: controller.signal })
      .then(setSubjects)
      .catch(() => setSubjects([]));
    return () => controller.abort();
  }, []);

  return subjects;
}

/** Fields every account needs, kept in one place so the two forms cannot drift. */
function CredentialFields({ errors }: { errors: FieldErrors }) {
  return (
    <>
      <FormField label="Email" error={errors.email} required>
        {({ id, describedBy, invalid }) => (
          <Input
            id={id}
            name="email"
            type="email"
            autoComplete="email"
            aria-describedby={describedBy}
            invalid={invalid}
          />
        )}
      </FormField>

      <FormField
        label="Phone number"
        hint="Include your country code, for example +919876543210. Used to sign in and to verify your account."
        error={errors.phone}
        required
      >
        {({ id, describedBy, invalid }) => (
          <Input
            id={id}
            name="phone"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            aria-describedby={describedBy}
            invalid={invalid}
          />
        )}
      </FormField>

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField
          label="Password"
          hint="At least 10 characters, with an uppercase letter, a lowercase letter and a number."
          error={errors.password}
          required
        >
          {({ id, describedBy, invalid }) => (
            <Input
              id={id}
              name="password"
              type="password"
              autoComplete="new-password"
              aria-describedby={describedBy}
              invalid={invalid}
            />
          )}
        </FormField>

        <FormField label="Confirm password" error={errors.confirmPassword} required>
          {({ id, describedBy, invalid }) => (
            <Input
              id={id}
              name="confirmPassword"
              type="password"
              autoComplete="new-password"
              aria-describedby={describedBy}
              invalid={invalid}
            />
          )}
        </FormField>
      </div>
    </>
  );
}

function ScholarForm({ avatarPreset }: { avatarPreset: AvatarPreset }) {
  const router = useRouter();
  const adoptSession = useAuthStore((state) => state.adoptSession);
  const subjects = useSubjects();
  const [school, setSchool] = useState<SchoolSelection>({});
  const [subjectIds, setSubjectIds] = useState<string[]>([]);
  const [interestedSubjectIds, setInterestedSubjectIds] = useState<string[]>([]);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const section = String(form.get('section') ?? '').trim();

    const parsed = parseForm(registerScholarSchema, {
      fullName: form.get('fullName'),
      avatarPreset,
      grade: form.get('grade'),
      ...(section ? { section } : {}),
      subjectIds,
      interestedSubjectIds,
      email: form.get('email'),
      phone: form.get('phone'),
      password: form.get('password'),
      confirmPassword: form.get('confirmPassword'),
      ...school,
    });

    if (!parsed.ok) {
      setErrors(parsed.errors);
      return;
    }

    setErrors({});
    setSubmitting(true);
    try {
      const session = await getApiClient().auth.registerScholar(parsed.data);
      adoptSession(session);
      router.push(session.redirectTo);
    } catch (error) {
      setErrors(toFormErrors(error));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card>
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
        {errors[FORM_ERROR] && <Alert tone="danger">{errors[FORM_ERROR]}</Alert>}

        <FormField label="Full name" error={errors.fullName} required>
          {({ id, describedBy, invalid }) => (
            <Input
              id={id}
              name="fullName"
              autoComplete="name"
              aria-describedby={describedBy}
              invalid={invalid}
            />
          )}
        </FormField>

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Grade" error={errors.grade} required>
            {({ id, describedBy, invalid }) => (
              <Select
                id={id}
                name="grade"
                defaultValue=""
                placeholder="Select your grade"
                aria-describedby={describedBy}
                invalid={invalid}
                options={ALL_GRADE_LEVELS.map((grade) => ({
                  value: grade,
                  label: GRADE_LABELS[grade],
                }))}
              />
            )}
          </FormField>

          <FormField label="Section" hint="Optional, for example B." error={errors.section}>
            {({ id, describedBy, invalid }) => (
              <Input id={id} name="section" aria-describedby={describedBy} invalid={invalid} />
            )}
          </FormField>
        </div>

        <SchoolPicker value={school} onChange={setSchool} errors={errors} />

        <SubjectPicker
          id="scholar-subjects"
          legend="Subjects you are studying"
          hint="Pick at least one. You can change these later."
          subjects={subjects}
          selected={subjectIds}
          onChange={setSubjectIds}
          error={errors.subjectIds}
        />

        <SubjectPicker
          id="scholar-interests"
          legend="Subjects you want to explore"
          hint="Optional. These shape what Ncanny suggests to you."
          subjects={subjects}
          selected={interestedSubjectIds}
          onChange={setInterestedSubjectIds}
          error={errors.interestedSubjectIds}
        />

        <CredentialFields errors={errors} />

        <Button type="submit" loading={submitting} fullWidth size="lg">
          Create my Canny ID
        </Button>
      </form>
    </Card>
  );
}

function PreceptorForm({ avatarPreset }: { avatarPreset: AvatarPreset }) {
  const router = useRouter();
  const adoptSession = useAuthStore((state) => state.adoptSession);
  const subjects = useSubjects();
  const [school, setSchool] = useState<SchoolSelection>({});
  const [teachingSubjectIds, setTeachingSubjectIds] = useState<string[]>([]);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const preceptorRole = String(form.get('preceptorRole') ?? '').trim();
    const years = String(form.get('yearsOfExperience') ?? '').trim();
    const knowledgeAreas = String(form.get('knowledgeAreas') ?? '')
      .split(',')
      .map((value) => value.trim())
      .filter((value) => value.length > 0);

    const parsed = parseForm(registerPreceptorSchema, {
      fullName: form.get('fullName'),
      avatarPreset,
      ...(preceptorRole ? { preceptorRole } : {}),
      ...(years ? { yearsOfExperience: years } : {}),
      teachingSubjectIds,
      knowledgeAreas,
      email: form.get('email'),
      phone: form.get('phone'),
      password: form.get('password'),
      confirmPassword: form.get('confirmPassword'),
      ...school,
    });

    if (!parsed.ok) {
      setErrors(parsed.errors);
      return;
    }

    setErrors({});
    setSubmitting(true);
    try {
      const session = await getApiClient().auth.registerPreceptor(parsed.data);
      adoptSession(session);
      router.push(session.redirectTo);
    } catch (error) {
      setErrors(toFormErrors(error));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card>
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
        {errors[FORM_ERROR] && <Alert tone="danger">{errors[FORM_ERROR]}</Alert>}

        <FormField label="Full name" error={errors.fullName} required>
          {({ id, describedBy, invalid }) => (
            <Input
              id={id}
              name="fullName"
              autoComplete="name"
              aria-describedby={describedBy}
              invalid={invalid}
            />
          )}
        </FormField>

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            label="Role at school"
            hint="Optional, for example Senior Science Preceptor."
            error={errors.preceptorRole}
          >
            {({ id, describedBy, invalid }) => (
              <Input
                id={id}
                name="preceptorRole"
                aria-describedby={describedBy}
                invalid={invalid}
              />
            )}
          </FormField>

          <FormField
            label="Years of experience"
            hint="Optional."
            error={errors.yearsOfExperience}
          >
            {({ id, describedBy, invalid }) => (
              <Input
                id={id}
                name="yearsOfExperience"
                type="number"
                min={0}
                max={70}
                aria-describedby={describedBy}
                invalid={invalid}
              />
            )}
          </FormField>
        </div>

        <SchoolPicker value={school} onChange={setSchool} errors={errors} />

        <SubjectPicker
          id="preceptor-subjects"
          legend="Subjects you teach"
          hint="Pick at least one."
          subjects={subjects}
          selected={teachingSubjectIds}
          onChange={setTeachingSubjectIds}
          error={errors.teachingSubjectIds}
        />

        <FormField
          label="Knowledge areas"
          hint="Optional. Separate with commas, for example: organic chemistry, lab safety."
          error={errors.knowledgeAreas}
        >
          {({ id, describedBy, invalid }) => (
            <Input id={id} name="knowledgeAreas" aria-describedby={describedBy} invalid={invalid} />
          )}
        </FormField>

        <CredentialFields errors={errors} />

        <Button type="submit" loading={submitting} fullWidth size="lg">
          Create my Canny ID
        </Button>
      </form>
    </Card>
  );
}
