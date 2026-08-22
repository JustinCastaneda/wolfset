import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

// Deliberately bare. Fonts (Geom), the token module and the design system land in Phase 3.
// Styling is decided: StyleSheet + typed tokens from Figma Variables (decision #4).

export default function RootLayout() {
  return (
    <>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false }} />
    </>
  );
}
