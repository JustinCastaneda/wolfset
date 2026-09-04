import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { useWatchStart } from '@/features/home/use-watch-start';

// Deliberately bare. Fonts (Geom), the token module and the design system land in Phase 3.
// Styling is decided: StyleSheet + typed tokens from Figma Variables (decision #4).
// The one app-wide listener: Next Workout on the watch opens the session from anywhere.

export default function RootLayout() {
  useWatchStart();
  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false }} />
    </SafeAreaProvider>
  );
}
