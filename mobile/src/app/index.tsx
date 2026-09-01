import { Link, router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/Button';
import { color, type } from '@/theme/tokens';

// Placeholder shell so the app boots and CI has something to typecheck.
// The first real screen is the Set Loop (Phase 4) — build it as a state machine,
// not as screens. See docs/build-plan.md.

export default function Index() {
  return (
    <View style={styles.root}>
      <Text style={styles.wordmark}>
        <Text style={styles.wolf}>WOLF</Text>
        <Text style={styles.set}>SET</Text>
      </Text>
      <View style={styles.startBar}>
        <Button onPress={() => router.push('/session')} title="Start Workout" />
      </View>
      {__DEV__ && (
        <Link href="/design-kit" style={styles.kitLink}>
          Design Kit
        </Link>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: color.bg.base },
  // Wordmark is Geom Black (the h1 token), WOLF red / SET white — the naming rule in CLAUDE.md.
  wordmark: { ...type.h1, letterSpacing: 2 },
  startBar: { alignSelf: 'stretch', paddingHorizontal: 24, marginTop: 48 },
  kitLink: { ...type.label, color: color.text.muted, marginTop: 24, padding: 12 },
  wolf: { color: color.brand },
  set: { color: color.text.primary },
});
