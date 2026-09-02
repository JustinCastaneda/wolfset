import { Delete } from 'lucide-react-native';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { color, type } from '@/theme/tokens';

// The custom numeric keypad (Edit Weights / Custom, node 34:970). Built, not borrowed:
// the OS pad's keys are too small for gym use (brief §02). Keys are the Secondary
// button recipe — 64px minimum, raised background, Button type — in a 16px grid.
// "." replaced the prescriptive ".5" (Justin, 2026-09-02): type any decimal; additive
// half-steps on a keyboard were ambiguous. Delete is the lucide glyph (10:9698).

export type KeypadKey = '0' | '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '.' | 'delete';

const ROWS: KeypadKey[][] = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
  ['delete', '0', '.'],
];

export function Keypad({ onKey }: { onKey: (key: KeypadKey) => void }) {
  return (
    <View style={styles.pad}>
      {ROWS.map((row) => (
        <View key={row.join()} style={styles.row}>
          {row.map((key) => (
            <Pressable
              accessibilityLabel={key === 'delete' ? 'delete' : key}
              accessibilityRole="button"
              key={key}
              onPress={() => onKey(key)}
              style={({ pressed }) => [styles.key, pressed && styles.keyPressed]}
            >
              {key === 'delete' ? (
                <Delete color={color.text.onButton} size={24} />
              ) : (
                <Text style={styles.label}>{key}</Text>
              )}
            </Pressable>
          ))}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  pad: { gap: 16, padding: 24, alignSelf: 'stretch' },
  row: { flexDirection: 'row', gap: 16 },
  key: {
    flex: 1,
    minHeight: 64,
    minWidth: 64,
    padding: 20,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: color.bg.raised,
  },
  keyPressed: { backgroundColor: color.press.raised },
  label: { ...type.button, color: color.text.onButton },
});
