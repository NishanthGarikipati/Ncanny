import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { Text } from 'react-native';
import { Button, Card, Muted, Screen } from '../src/components/ui';
import { useAuthStore } from '../src/lib/auth-store';
import { useTheme } from '../src/theme/theme';

const LOOP = ['Learn', 'Create', 'Play', 'Share', 'Review', 'Earn', 'Connect'];

export default function LandingScreen() {
  const router = useRouter();
  const colors = useTheme();
  const status = useAuthStore((state) => state.status);

  useEffect(() => {
    if (status === 'authenticated') {
      router.replace('/home');
    }
  }, [status, router]);

  return (
    <Screen>
      <Text style={{ color: colors.primary, fontWeight: '700', letterSpacing: 0.4 }}>NCANNY</Text>
      <Text
        accessibilityRole="header"
        style={{ color: colors.text, fontSize: 32, fontWeight: '700' }}
      >
        Where school work becomes something worth sharing.
      </Text>
      <Muted>
        A permanent academic identity for every Scholar, and Preceptors who review the work
        properly. Student profiles are visible to their school by default.
      </Muted>
      <Button label="Create your Canny ID" onPress={() => router.push('/register')} />
      <Button label="Mark attendance" variant="secondary" onPress={() => router.push('/attendance')} />
      <Card>
        <Text style={{ color: colors.text, fontWeight: '700' }}>The Ncanny loop</Text>
        <Muted>{LOOP.join(' → ')}</Muted>
      </Card>
    </Screen>
  );
}
