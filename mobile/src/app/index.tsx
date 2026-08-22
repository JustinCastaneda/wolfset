import { StyleSheet, Text, View } from 'react-native';

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
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#111214' },
  wordmark: { fontSize: 32, fontWeight: '800', letterSpacing: 2 },
  wolf: { color: '#f04245' },
  set: { color: '#ffffff' },
});
