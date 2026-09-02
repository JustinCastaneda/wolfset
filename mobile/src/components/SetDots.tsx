import { StyleSheet, View } from 'react-native';

import { color } from '@/theme/tokens';

// The vertical dot column on in-progress exercise rows with 4 or fewer sets
// (Workout Summary / Progress / Set 2 started, node 433:22215): one dot per
// prescribed set, logged sets filled brand, the rest muted.

export function SetDots({ done, total }: { done: number; total: number }) {
  return (
    <View style={styles.column}>
      {Array.from({ length: total }, (_, i) => (
        <View key={i} style={[styles.dot, i < done ? styles.dotDone : styles.dotUpcoming]} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  column: { gap: 4, alignItems: 'center' },
  dot: { width: 8, height: 8, borderRadius: 4 },
  dotDone: { backgroundColor: color.brand },
  dotUpcoming: { backgroundColor: color.border },
});
