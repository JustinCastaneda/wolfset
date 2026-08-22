import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

// Deliberately bare. Theming, fonts (Geom) and the design system land in Phase 3 —
// see open decision #4 (NativeWind vs StyleSheet + tokens), which is still unresolved.
// Do not add a styling approach here before that decision is made.

export default function RootLayout() {
  return (
    <>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false }} />
    </>
  );
}
