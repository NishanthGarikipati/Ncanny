import { useRouter } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { Banner, Button, Card, Chip, Screen, TextField } from '../src/components/ui';
import { getApiClient } from '../src/lib/api';
import { useAuthStore } from '../src/lib/auth-store';
import { FORM_ERROR, parseForm, toFormErrors, type FieldErrors } from '../src/lib/form';
import { loginSchema, otpRequestSchema, otpVerifySchema } from '@ncanny/validation';

type Method = 'password' | 'otp';

/** Sign-in. Password and phone code are peers: many Scholars have a phone and no reliable email. */
export default function AttendanceScreen() {
  const [method, setMethod] = useState<Method>('password');

  return (
    <Screen
      title="Mark attendance"
      subtitle="Signing in records your attendance streak for the day."
    >
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <Chip
          label="Email"
          selected={method === 'password'}
          onPress={() => setMethod('password')}
        />
        <Chip label="Phone code" selected={method === 'otp'} onPress={() => setMethod('otp')} />
      </View>
      <Card>{method === 'password' ? <PasswordForm /> : <OtpForm />}</Card>
    </Screen>
  );
}

function PasswordForm() {
  const router = useRouter();
  const adoptSession = useAuthStore((state) => state.adoptSession);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    const parsed = parseForm(loginSchema, { email, password });
    if (!parsed.ok) {
      setErrors(parsed.errors);
      return;
    }
    setErrors({});
    setSubmitting(true);
    try {
      const session = await getApiClient().auth.login(parsed.data);
      adoptSession(session);
      router.replace(session.redirectTo as '/home');
    } catch (error) {
      setErrors(toFormErrors(error));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={{ gap: 12 }}>
      {errors[FORM_ERROR] ? <Banner tone="danger" message={errors[FORM_ERROR]} /> : null}
      <TextField
        label="Email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
        error={errors.email}
      />
      <TextField
        label="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        autoComplete="current-password"
        error={errors.password}
      />
      <Button label="Mark attendance" loading={submitting} onPress={() => void submit()} />
    </View>
  );
}

function OtpForm() {
  const router = useRouter();
  const adoptSession = useAuthStore((state) => state.adoptSession);
  const [stage, setStage] = useState<'request' | 'verify'>('request');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [notice, setNotice] = useState<string | null>(null);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitting, setSubmitting] = useState(false);

  const requestCode = async () => {
    const parsed = parseForm(otpRequestSchema, { phone });
    if (!parsed.ok) {
      setErrors(parsed.errors);
      return;
    }
    setErrors({});
    setSubmitting(true);
    try {
      const result = await getApiClient().auth.requestOtp(parsed.data);
      setPhone(parsed.data.phone);
      setStage('verify');
      setNotice(
        `If that number belongs to an Ncanny account, a 6-digit code is on its way. It expires in ${Math.round(result.expiresInSeconds / 60)} minutes.`,
      );
    } catch (error) {
      setErrors(toFormErrors(error));
    } finally {
      setSubmitting(false);
    }
  };

  const verify = async () => {
    const parsed = parseForm(otpVerifySchema, { phone, code });
    if (!parsed.ok) {
      setErrors(parsed.errors);
      return;
    }
    setErrors({});
    setSubmitting(true);
    try {
      const session = await getApiClient().auth.verifyOtp(parsed.data);
      adoptSession(session);
      router.replace(session.redirectTo as '/home');
    } catch (error) {
      setErrors(toFormErrors(error));
    } finally {
      setSubmitting(false);
    }
  };

  if (stage === 'request') {
    return (
      <View style={{ gap: 12 }}>
        {errors[FORM_ERROR] ? <Banner tone="danger" message={errors[FORM_ERROR]} /> : null}
        <TextField
          label="Phone number"
          hint="Include your country code, for example +919876543210."
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
          autoComplete="tel"
          error={errors.phone}
        />
        <Button label="Send code" loading={submitting} onPress={() => void requestCode()} />
      </View>
    );
  }

  return (
    <View style={{ gap: 12 }}>
      {notice ? <Banner tone="info" message={notice} /> : null}
      {errors[FORM_ERROR] ? <Banner tone="danger" message={errors[FORM_ERROR]} /> : null}
      <TextField
        label="6-digit code"
        value={code}
        onChangeText={setCode}
        keyboardType="number-pad"
        maxLength={6}
        error={errors.code}
      />
      <Button label="Mark attendance" loading={submitting} onPress={() => void verify()} />
      <Button
        label="Use a different number"
        variant="ghost"
        onPress={() => {
          setStage('request');
          setErrors({});
          setNotice(null);
        }}
      />
    </View>
  );
}
