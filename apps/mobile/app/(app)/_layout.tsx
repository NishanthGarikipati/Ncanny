import { Stack, useRouter } from 'expo-router';
import { useEffect } from 'react';
import { Muted, Screen } from '../../src/components/ui';
import { useAuthStore } from '../../src/lib/auth-store';
import { useTheme } from '../../src/theme/theme';

/** Convenience guard only. Every protected resource is authorised again by the API. */
export default function AuthenticatedLayout() {
  const router = useRouter();
  const status = useAuthStore((state) => state.status);

  useEffect(() => {
    if (status === 'anonymous') {
      router.replace('/attendance');
    }
  }, [status, router]);

  const colors = useTheme();

  if (status !== 'authenticated') {
    return (
      <Screen title="Ncanny">
        <Muted>Checking your attendance</Muted>
      </Screen>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="settings" />
      <Stack.Screen
        name="work/[id]"
        options={{
          headerShown: true,
          title: 'Work',
          headerStyle: { backgroundColor: colors.surface },
          headerTintColor: colors.text,
          headerTitleStyle: { color: colors.text },
        }}
      />
      <Stack.Screen
        name="people/[cannyId]"
        options={{
          headerShown: true,
          title: 'Profile',
          headerStyle: { backgroundColor: colors.surface },
          headerTintColor: colors.text,
          headerTitleStyle: { color: colors.text },
        }}
      />
    </Stack>
  );
}
