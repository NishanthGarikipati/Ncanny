import { ALL_GRADE_LEVELS, GRADE_LABELS, UserRole, type Subject } from '@ncanny/types';
import { registerPreceptorSchema, registerScholarSchema } from '@ncanny/validation';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { SchoolField, type SchoolSelection } from '../src/components/SchoolField';
import { SubjectChips } from '../src/components/SubjectChips';
import { Banner, Button, Card, Chip, Muted, Screen, TextField } from '../src/components/ui';
import { getApiClient } from '../src/lib/api';
import { useAuthStore } from '../src/lib/auth-store';
import { FORM_ERROR, parseForm, toFormErrors, type FieldErrors } from '../src/lib/form';

type SelfRole = typeof UserRole.SCHOLAR | typeof UserRole.PRECEPTOR;

export default function RegisterScreen() {
  const [role, setRole] = useState<SelfRole | null>(null);

  if (!role) {
    return (
      <Screen
        title="Create your Canny ID"
        subtitle="Your Canny ID is your permanent academic identity on Ncanny."
      >
        <Card>
          <Muted>I am a Scholar — a school student who creates work and earns recognition for it.</Muted>
          <Button label="Continue as a Scholar" onPress={() => setRole(UserRole.SCHOLAR)} />
        </Card>
        <Card>
          <Muted>I am a Preceptor — a teacher who reviews work, gives feedback and awards badges.</Muted>
          <Button label="Continue as a Preceptor" onPress={() => setRole(UserRole.PRECEPTOR)} />
        </Card>
      </Screen>
    );
  }

  return role === UserRole.SCHOLAR ? (
    <ScholarForm onBack={() => setRole(null)} />
  ) : (
    <PreceptorForm onBack={() => setRole(null)} />
  );
}

function useSubjects(): Subject[] {
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

function Credentials({
  email,
  setEmail,
  phone,
  setPhone,
  password,
  setPassword,
  confirmPassword,
  setConfirmPassword,
  errors,
}: {
  email: string;
  setEmail: (value: string) => void;
  phone: string;
  setPhone: (value: string) => void;
  password: string;
  setPassword: (value: string) => void;
  confirmPassword: string;
  setConfirmPassword: (value: string) => void;
  errors: FieldErrors;
}) {
  return (
    <View style={{ gap: 12 }}>
      <TextField
        label="Email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
        autoComplete="email"
        error={errors.email}
      />
      <TextField
        label="Phone number"
        hint="Include your country code, for example +919876543210."
        value={phone}
        onChangeText={setPhone}
        keyboardType="phone-pad"
        autoComplete="tel"
        error={errors.phone}
      />
      <TextField
        label="Password"
        hint="At least 10 characters, with an uppercase letter, a lowercase letter and a number."
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        autoComplete="new-password"
        error={errors.password}
      />
      <TextField
        label="Confirm password"
        value={confirmPassword}
        onChangeText={setConfirmPassword}
        secureTextEntry
        autoComplete="new-password"
        error={errors.confirmPassword}
      />
    </View>
  );
}

function ScholarForm({ onBack }: { onBack: () => void }) {
  const router = useRouter();
  const adoptSession = useAuthStore((state) => state.adoptSession);
  const subjects = useSubjects();
  const [fullName, setFullName] = useState('');
  const [grade, setGrade] = useState<string>(ALL_GRADE_LEVELS[0] ?? 'GRADE_1');
  const [section, setSection] = useState('');
  const [school, setSchool] = useState<SchoolSelection>({});
  const [subjectIds, setSubjectIds] = useState<string[]>([]);
  const [interestedSubjectIds, setInterestedSubjectIds] = useState<string[]>([]);
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    const parsed = parseForm(registerScholarSchema, {
      fullName,
      grade,
      ...(section.trim() ? { section: section.trim() } : {}),
      subjectIds,
      interestedSubjectIds,
      email,
      phone,
      password,
      confirmPassword,
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
      router.replace('/home');
    } catch (error) {
      setErrors(toFormErrors(error));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Screen title="Scholar registration" subtitle="This creates your Canny ID.">
      <Button label="Change role" variant="ghost" onPress={onBack} />
      {errors[FORM_ERROR] ? <Banner tone="danger" message={errors[FORM_ERROR]} /> : null}
      <TextField label="Full name" value={fullName} onChangeText={setFullName} error={errors.fullName} />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {ALL_GRADE_LEVELS.map((level) => (
          <Chip
            key={level}
            label={GRADE_LABELS[level]}
            selected={grade === level}
            onPress={() => setGrade(level)}
          />
        ))}
      </View>
      {errors.grade ? <Banner tone="danger" message={errors.grade} /> : null}
      <TextField label="Section" hint="Optional, for example B." value={section} onChangeText={setSection} error={errors.section} />
      <SchoolField value={school} onChange={setSchool} errors={errors} />
      <SubjectChips
        legend="Subjects you are studying"
        hint="Pick at least one."
        subjects={subjects}
        selected={subjectIds}
        onChange={setSubjectIds}
        error={errors.subjectIds}
      />
      <SubjectChips
        legend="Subjects you want to explore"
        hint="Optional."
        subjects={subjects}
        selected={interestedSubjectIds}
        onChange={setInterestedSubjectIds}
        error={errors.interestedSubjectIds}
      />
      <Credentials
        email={email}
        setEmail={setEmail}
        phone={phone}
        setPhone={setPhone}
        password={password}
        setPassword={setPassword}
        confirmPassword={confirmPassword}
        setConfirmPassword={setConfirmPassword}
        errors={errors}
      />
      <Button label="Create my Canny ID" loading={submitting} onPress={() => void submit()} />
    </Screen>
  );
}

function PreceptorForm({ onBack }: { onBack: () => void }) {
  const router = useRouter();
  const adoptSession = useAuthStore((state) => state.adoptSession);
  const subjects = useSubjects();
  const [fullName, setFullName] = useState('');
  const [preceptorRole, setPreceptorRole] = useState('');
  const [years, setYears] = useState('');
  const [school, setSchool] = useState<SchoolSelection>({});
  const [teachingSubjectIds, setTeachingSubjectIds] = useState<string[]>([]);
  const [knowledgeAreas, setKnowledgeAreas] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    const areas = knowledgeAreas
      .split(',')
      .map((value) => value.trim())
      .filter((value) => value.length > 0);
    const parsed = parseForm(registerPreceptorSchema, {
      fullName,
      ...(preceptorRole.trim() ? { preceptorRole: preceptorRole.trim() } : {}),
      ...(years.trim() ? { yearsOfExperience: years.trim() } : {}),
      teachingSubjectIds,
      knowledgeAreas: areas,
      email,
      phone,
      password,
      confirmPassword,
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
      router.replace('/home');
    } catch (error) {
      setErrors(toFormErrors(error));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Screen title="Preceptor registration" subtitle="This creates your Canny ID.">
      <Button label="Change role" variant="ghost" onPress={onBack} />
      {errors[FORM_ERROR] ? <Banner tone="danger" message={errors[FORM_ERROR]} /> : null}
      <TextField label="Full name" value={fullName} onChangeText={setFullName} error={errors.fullName} />
      <TextField
        label="Role at school"
        hint="Optional, for example Senior Science Preceptor."
        value={preceptorRole}
        onChangeText={setPreceptorRole}
        error={errors.preceptorRole}
      />
      <TextField
        label="Years of experience"
        hint="Optional."
        value={years}
        onChangeText={setYears}
        keyboardType="number-pad"
        error={errors.yearsOfExperience}
      />
      <SchoolField value={school} onChange={setSchool} errors={errors} />
      <SubjectChips
        legend="Subjects you teach"
        hint="Pick at least one."
        subjects={subjects}
        selected={teachingSubjectIds}
        onChange={setTeachingSubjectIds}
        error={errors.teachingSubjectIds}
      />
      <TextField
        label="Knowledge areas"
        hint="Optional. Separate with commas."
        value={knowledgeAreas}
        onChangeText={setKnowledgeAreas}
        error={errors.knowledgeAreas}
      />
      <Credentials
        email={email}
        setEmail={setEmail}
        phone={phone}
        setPhone={setPhone}
        password={password}
        setPassword={setPassword}
        confirmPassword={confirmPassword}
        setConfirmPassword={setConfirmPassword}
        errors={errors}
      />
      <Button label="Create my Canny ID" loading={submitting} onPress={() => void submit()} />
    </Screen>
  );
}
