import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

// Deliberately bare. Fonts (Geom), the token module and the design system land in Phase 3.
// Styling is decided: StyleSheet + typed tokens from Figma Variables (decision #4).

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false }} />
    </SafeAreaProvider>
  );
}
