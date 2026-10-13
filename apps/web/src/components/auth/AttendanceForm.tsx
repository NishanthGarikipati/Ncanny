'use client';

import { ApiError } from '@ncanny/api-client';
import { Alert, Button, Card, FormField, Input, Tabs, TabPanel } from '@ncanny/ui';
import { loginSchema, otpRequestSchema, otpVerifySchema } from '@ncanny/validation';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { getApiClient } from '../../lib/api';
import { useAuthStore } from '../../lib/auth-store';
import { FORM_ERROR, parseForm, toFormErrors, type FieldErrors } from '../../lib/form';

type Method = 'password' | 'otp';

/**
 * Sign-in, called "marking attendance" in product language. Password and phone
 * OTP are peers rather than primary/fallback: many Scholars have a phone but
 * not a reliable email.
 */
export function AttendanceForm() {
  const [method, setMethod] = useState<Method>('password');

  return (
    <Card>
      <Tabs
        aria-label="Attendance method"
        activeId={method}
        onChange={(id) => setMethod(id as Method)}
        items={[
          { id: 'password', label: 'Email and password' },
          { id: 'otp', label: 'Phone code' },
        ]}
      />
      <TabPanel id="password" activeId={method}>
        <PasswordForm />
      </TabPanel>
      <TabPanel id="otp" activeId={method}>
        <OtpForm />
      </TabPanel>
    </Card>
  );
}

function PasswordForm() {
  const router = useRouter();
  const adoptSession = useAuthStore((state) => state.adoptSession);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const parsed = parseForm(loginSchema, {
      email: form.get('email'),
      password: form.get('password'),
    });

    if (!parsed.ok) {
      setErrors(parsed.errors);
      return;
    }

    setErrors({});
    setSubmitting(true);
    try {
      const session = await getApiClient().auth.login(parsed.data);
      adoptSession(session);
      router.push(session.redirectTo);
    } catch (error) {
      setErrors(toFormErrors(error));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
      {errors[FORM_ERROR] && <Alert tone="danger">{errors[FORM_ERROR]}</Alert>}

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

      <FormField label="Password" error={errors.password} required>
        {({ id, describedBy, invalid }) => (
          <Input
            id={id}
            name="password"
            type="password"
            autoComplete="current-password"
            aria-describedby={describedBy}
            invalid={invalid}
          />
        )}
      </FormField>

      <Button type="submit" loading={submitting} fullWidth>
        Mark attendance
      </Button>
    </form>
  );
}

function OtpForm() {
  const router = useRouter();
  const adoptSession = useAuthStore((state) => state.adoptSession);
  const [stage, setStage] = useState<'request' | 'verify'>('request');
  const [phone, setPhone] = useState('');
  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const requestCode = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const parsed = parseForm(otpRequestSchema, { phone: form.get('phone') });
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
      // The server never confirms whether the number is registered, so the
      // wording here must not imply that it is.
      setNotice(
        `If that number belongs to an Ncanny account, a 6-digit code is on its way. It expires in ${Math.round(
          result.expiresInSeconds / 60,
        )} minutes.`,
      );
    } catch (error) {
      setErrors(toFormErrors(error));
    } finally {
      setSubmitting(false);
    }
  };

  const verifyCode = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const parsed = parseForm(otpVerifySchema, { phone, code: form.get('code') });
    if (!parsed.ok) {
      setErrors(parsed.errors);
      return;
    }

    setErrors({});
    setSubmitting(true);
    try {
      const session = await getApiClient().auth.verifyOtp(parsed.data);
      adoptSession(session);
      router.push(session.redirectTo);
    } catch (error) {
      setErrors(toFormErrors(error));
      if (error instanceof ApiError && error.status === 429) {
        setStage('request');
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (stage === 'request') {
    return (
      <form onSubmit={requestCode} noValidate className="flex flex-col gap-4">
        {errors[FORM_ERROR] && <Alert tone="danger">{errors[FORM_ERROR]}</Alert>}

        <FormField
          label="Phone number"
          hint="Include your country code, for example +919876543210."
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
              defaultValue={phone}
              aria-describedby={describedBy}
              invalid={invalid}
            />
          )}
        </FormField>

        <Button type="submit" loading={submitting} fullWidth>
          Send code
        </Button>
      </form>
    );
  }

  return (
    <form onSubmit={verifyCode} noValidate className="flex flex-col gap-4">
      {notice && <Alert tone="info">{notice}</Alert>}
      {errors[FORM_ERROR] && <Alert tone="danger">{errors[FORM_ERROR]}</Alert>}

      <FormField label="6-digit code" error={errors.code} required>
        {({ id, describedBy, invalid }) => (
          <Input
            id={id}
            name="code"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            aria-describedby={describedBy}
            invalid={invalid}
          />
        )}
      </FormField>

      <Button type="submit" loading={submitting} fullWidth>
        Mark attendance
      </Button>

      <Button
        type="button"
        variant="ghost"
        onClick={() => {
          setStage('request');
          setErrors({});
          setNotice(null);
        }}
      >
        Use a different number
      </Button>
    </form>
  );
}
