'use client';

import type { SessionSummary } from '@ncanny/types';
import { Alert, Badge, Button, Card, CardHeader, LoadingState, useToast } from '@ncanny/ui';
import { useCallback, useEffect, useState } from 'react';
import { getApiClient } from '../../../lib/api';
import { useAuthStore } from '../../../lib/auth-store';

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

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <header>
        <p className="kicker">Base</p>
        <h1 className="mt-1 font-display text-3xl font-semibold text-content">Settings</h1>
      </header>

      <Card>
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

      <Card>
        <CardHeader
          title="Recent sign-ins"
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
          <Button variant="danger" onClick={() => void signOutEverywhere()}>
            Sign out everywhere
          </Button>
        </div>
      </Card>
    </div>
  );
}
