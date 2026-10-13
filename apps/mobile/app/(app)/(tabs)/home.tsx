import { UserRole } from '@ncanny/types';
import { useRouter } from 'expo-router';
import { Text, View } from 'react-native';
import { Button, Card, Muted, Screen } from '../../../src/components/ui';
import { useAuthStore } from '../../../src/lib/auth-store';
import { useTheme } from '../../../src/theme/theme';

export default function HomeScreen() {
  const router = useRouter();
  const colors = useTheme();
  const user = useAuthStore((state) => state.user);
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
        <Text style={{ color: colors.text, fontWeight: '700' }}>Your feed</Text>
        <Muted>
          {scholar
            ? 'Creating and sharing work arrives in the next milestone. Finish your profile so Preceptors can find you.'
            : 'Scholar submissions arrive in the next milestone. Finish your profile so your Scholars can find you.'}
        </Muted>
        <Button
          label="Go to my profile"
          onPress={() => router.push('/profile')}
        />
      </Card>
      <Button label="Settings" variant="secondary" onPress={() => router.push('/settings')} />
    </Screen>
  );
}
