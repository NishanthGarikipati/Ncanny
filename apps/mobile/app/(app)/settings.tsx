import type { SessionSummary } from '@ncanny/types';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { Banner, Button, Card, Muted, Screen } from '../../src/components/ui';
import { getApiClient } from '../../src/lib/api';
import { useAuthStore } from '../../src/lib/auth-store';
import { useTheme } from '../../src/theme/theme';

export default function SettingsScreen() {
  const router = useRouter();
  const colors = useTheme();
  const user = useAuthStore((state) => state.user);
  const signOut = useAuthStore((state) => state.signOut);
  const [sessions, setSessions] = useState<SessionSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setSessions(await getApiClient().auth.sessions());
    } catch {
      setError('Could not load your recent sign-ins.');
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (!user) return null;

  const signOutEverywhere = async () => {
    try {
      await getApiClient().auth.logoutAll();
      setNotice('Signed out on every device.');
      await signOut();
      router.replace('/attendance');
    } catch {
      setError('Could not sign out everywhere.');
    }
  };

  return (
    <Screen title="Settings" subtitle="Account details and recent sign-ins.">
      <Button label="Back" variant="ghost" onPress={() => router.back()} />
      <Card>
        <Row label="Canny ID" value={user.cannyId ?? '—'} />
        <Row label="Email" value={user.email} />
        <Row label="Phone" value={user.phone ? `${user.phone} (${user.phoneVerified ? 'verified' : 'not verified'})` : '—'} />
      </Card>
      <Card>
        <Text style={{ color: colors.text, fontWeight: '700' }}>Recent sign-ins</Text>
        <Muted>If you do not recognise one of these, sign out everywhere.</Muted>
        {error ? <Banner tone="danger" message={error} /> : null}
        {notice ? <Banner tone="success" message={notice} /> : null}
        {sessions === null && !error ? <Muted>Loading sign-ins</Muted> : null}
        {sessions?.map((session) => (
          <View key={session.id} style={{ gap: 2 }}>
            <Text style={{ color: colors.text }}>
              {new Date(session.lastUsedAt).toLocaleString()}
              {session.current ? ' · This device' : ''}
            </Text>
            <Muted>{session.userAgent ?? 'Unknown device'}</Muted>
          </View>
        ))}
      </Card>
      <Button
        label="Sign out"
        variant="secondary"
        onPress={() => {
          void signOut().then(() => router.replace('/attendance'));
        }}
      />
      <Button label="Sign out everywhere" variant="danger" onPress={() => void signOutEverywhere()} />
    </Screen>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  const colors = useTheme();
  return (
    <View style={{ gap: 2 }}>
      <Muted>{label}</Muted>
      <Text style={{ color: colors.text, fontSize: 16 }}>{value}</Text>
    </View>
  );
}
