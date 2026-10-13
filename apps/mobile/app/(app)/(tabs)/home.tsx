import { UserRole, type WorkCard } from '@ncanny/types';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { WorkList } from '../../../src/components/WorkList';
import { Button, Card, Muted, Screen } from '../../../src/components/ui';
import { getApiClient } from '../../../src/lib/api';
import { useAuthStore } from '../../../src/lib/auth-store';
import { useTheme } from '../../../src/theme/theme';

export default function HomeScreen() {
  const router = useRouter();
  const colors = useTheme();
  const user = useAuthStore((state) => state.user);
  const [works, setWorks] = useState<WorkCard[]>([]);

  useEffect(() => {
    const controller = new AbortController();
    getApiClient()
      .content.feed({ limit: 4 }, { signal: controller.signal })
      .then((page) => setWorks(page.items))
      .catch(() => {
        if (!controller.signal.aborted) setWorks([]);
      });
    return () => controller.abort();
  }, []);

  if (!user) return null;

  const scholar = user.role === UserRole.SCHOLAR;

  return (
    <Screen>
      <Text accessibilityRole="header" style={{ color: colors.text, fontSize: 28, fontWeight: '700' }}>
        Welcome back
      </Text>
      <Muted>
        {user.fullName}. Your Canny ID is {user.cannyId ?? 'pending'}.
      </Muted>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <Card>
          <Muted>Role</Muted>
          <Text style={{ color: colors.text, fontWeight: '700' }}>{scholar ? 'Scholar' : 'Preceptor'}</Text>
        </Card>
        <Card>
          <Muted>Phone</Muted>
          <Text style={{ color: colors.text, fontWeight: '700' }}>
            {user.phoneVerified ? 'Verified' : 'Not yet'}
          </Text>
        </Card>
      </View>
      <Card>
        <Text style={{ color: colors.text, fontWeight: '700' }}>Your school</Text>
        <Muted>
          {works.length === 0
            ? 'Nothing is published yet. Essays and study activities you write appear here and on the whiteboard.'
            : 'Newest work from your school. The walkable hall is on the web app.'}
        </Muted>
        {works.length > 0 ? <WorkList works={works} onOpen={(id) => router.push(`/work/${id}`)} /> : null}
        <Button label="Open whiteboard" onPress={() => router.push('/explore')} />
        <Button label="Go to my profile" variant="secondary" onPress={() => router.push('/profile')} />
      </Card>
      <Button label="Settings" variant="secondary" onPress={() => router.push('/settings')} />
    </Screen>
  );
}
