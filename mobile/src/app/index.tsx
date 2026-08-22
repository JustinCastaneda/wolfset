import { StyleSheet, Text, View } from 'react-native';

// Placeholder shell so the app boots and CI has something to typecheck.
// The first real screen is the Set Loop (Phase 4) — build it as a state machine,
// not as screens. See docs/build-plan.md.
//
// Colors are the Figma Variables verbatim (Background, Brand, TextPrimary). They move
// into src/theme/tokens.ts in Phase 3a; inline hex here is the one temporary exception.

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
  root: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#201a18' },
  wordmark: { fontSize: 32, fontWeight: '800', letterSpacing: 2 },
  wolf: { color: '#f04245' },
  set: { color: '#fffdfb' },
});
