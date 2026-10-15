'use client';

import type { SessionSummary } from '@ncanny/types';
import { Alert, Badge, Button, Card, CardHeader, FormField, Input, LoadingState, useToast } from '@ncanny/ui';
import { changePasswordSchema } from '@ncanny/validation';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { ThemeToggle } from '../../../components/ThemeToggle';
import { getApiClient } from '../../../lib/api';
import { useAuthStore } from '../../../lib/auth-store';
import { FORM_ERROR, parseForm, toFormErrors, type FieldErrors } from '../../../lib/form';

/**
 * Settings shell for this milestone: account facts and session management.
 * Notification, privacy and school settings arrive with their own features.
 */
export default function SettingsPage() {
  const user = useAuthStore((state) => state.user);
  const signOut = useAuthStore((state) => state.signOut);
  const { showToast } = useToast();
  const [sessions, setSessions] = useState<SessionSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [passwordErrors, setPasswordErrors] = useState<FieldErrors>({});
  const [passwordSaved, setPasswordSaved] = useState(false);

  const loadSessions = useCallback(async () => {
    try {
      setSessions(await getApiClient().auth.sessions());
    } catch {
      setError('Could not load your recent sign-ins.');
    }
  }, []);

  useEffect(() => {
    void loadSessions();
  }, [loadSessions]);

  if (!user) return null;

  const signOutEverywhere = async () => {
    try {
      await getApiClient().auth.logoutAll();
      showToast({ tone: 'success', title: 'Signed out on every device' });
      await signOut();
    } catch {
      showToast({ tone: 'danger', title: 'Could not sign out everywhere' });
    }
  };

  const changePassword = async (form: FormData) => {
    const parsed = parseForm(changePasswordSchema, {
      currentPassword: form.get('currentPassword'),
      newPassword: form.get('newPassword'),
    });
    if (!parsed.ok) {
      setPasswordErrors(parsed.errors);
      setPasswordSaved(false);
      return;
    }
    try {
      await getApiClient().auth.changePassword(parsed.data);
      setPasswordErrors({});
      setPasswordSaved(true);
      showToast({ tone: 'success', title: 'Password updated. Other devices were signed out.' });
    } catch (cause) {
      setPasswordSaved(false);
      setPasswordErrors(toFormErrors(cause));
    }
  };

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <h1 className="neon-title text-2xl">Profile settings</h1>

      <div className="grid gap-4 lg:grid-cols-2">
      <Card className="border-2 border-primary shadow-hud">
        <CardHeader title="Account" />
        <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-content-muted">Canny ID</dt>
            <dd className="font-mono text-content">{user.cannyId ?? '—'}</dd>
          </div>
          <div>
            <dt className="text-content-muted">Email</dt>
            <dd className="text-content">{user.email}</dd>
          </div>
          <div>
            <dt className="text-content-muted">Phone</dt>
            <dd className="text-content">
              {user.phone ?? '—'}{' '}
              {user.phone && (
                <Badge tone={user.phoneVerified ? 'success' : 'warning'}>
                  {user.phoneVerified ? 'Verified' : 'Not verified'}
                </Badge>
              )}
            </dd>
          </div>
          <div>
            <dt className="text-content-muted">Member since</dt>
            <dd className="text-content">{new Date(user.createdAt).toLocaleDateString()}</dd>
          </div>
        </dl>
      </Card>

      <Card className="border-2 border-primary shadow-hud">
        <CardHeader
          title="Login activity"
          description="If you do not recognise one of these, sign out everywhere and change your password."
        />
        <div className="mt-4">
          {error && <Alert tone="danger">{error}</Alert>}
          {!error && sessions === null && <LoadingState label="Loading sign-ins" />}
          {sessions && (
            <ul className="divide-y divide-border">
              {sessions.map((session) => (
                <li key={session.id} className="flex items-start justify-between gap-4 py-3">
                  <div className="min-w-0 text-sm">
                    <p className="text-content">
                      {new Date(session.lastUsedAt).toLocaleString()}
                      {session.current && (
                        <>
                          {' '}
                          <Badge tone="primary">This device</Badge>
                        </>
                      )}
                    </p>
                    <p className="truncate text-content-muted">
                      {session.userAgent ?? 'Unknown device'}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <Button variant="secondary" onClick={() => void signOut()}>
            Sign out
          </Button>
          <Button variant="accent" onClick={() => void signOutEverywhere()}>
            Sign out everywhere
          </Button>
        </div>
      </Card>

      <Card className="border-2 border-primary shadow-hud">
        <CardHeader title="Password" description="Your current password is checked before the new one is stored." />
        <form
          className="mt-4 flex flex-col gap-3"
          onSubmit={(event) => {
            event.preventDefault();
            void changePassword(new FormData(event.currentTarget));
            event.currentTarget.reset();
          }}
        >
          {passwordSaved && <Alert tone="success">Password updated.</Alert>}
          {passwordErrors[FORM_ERROR] && <Alert tone="danger">{passwordErrors[FORM_ERROR]}</Alert>}
          <FormField label="Current password" error={passwordErrors.currentPassword}>
            {({ id, describedBy, invalid }) => (
              <Input id={id} name="currentPassword" type="password" autoComplete="current-password" aria-describedby={describedBy} invalid={invalid} />
            )}
          </FormField>
          <FormField label="New password" error={passwordErrors.newPassword}>
            {({ id, describedBy, invalid }) => (
              <Input id={id} name="newPassword" type="password" autoComplete="new-password" aria-describedby={describedBy} invalid={invalid} />
            )}
          </FormField>
          <Button type="submit">Change password</Button>
        </form>
      </Card>

      <Card className="border-2 border-primary shadow-hud">
        <CardHeader title="School and content" />
        <div className="mt-4 flex flex-col gap-2 text-sm">
          <Link href="/school" className="font-semibold text-primary">
            Open your school
          </Link>
          <Link href="/activity" className="font-semibold text-primary">
            Your published work
          </Link>
          <Link href="/create" className="font-semibold text-primary">
            Upload a new piece
          </Link>
          <Link href={user.cannyId ? `/profile/${user.cannyId}` : '/profile'} className="font-semibold text-primary">
            Privacy and profile
          </Link>
        </div>
        <div className="mt-4 flex items-center justify-between gap-3">
          <p className="text-sm text-content-muted">Theme. Motion follows the setting on your device.</p>
          <ThemeToggle />
        </div>
      </Card>
      </div>
    </div>
  );
}
