import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { useColorScheme } from 'react-native';
import { useAuthStore } from '../src/lib/auth-store';
import { ThemeProvider } from '../src/theme/theme';

export default function RootLayout() {
  const hydrate = useAuthStore((state) => state.hydrate);
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light';

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  return (
    <ThemeProvider scheme={scheme}>
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShown: false }} />
    </ThemeProvider>
  );
}
