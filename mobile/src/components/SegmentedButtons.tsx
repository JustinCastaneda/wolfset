import { StyleSheet, Text, View } from 'react-native';

import { Button } from './Button';
import { color, type } from '@/theme/tokens';

// Figma: the two-way "Button Group" on Dumbbell Scale and Personal Info (490:14900,
// 433:27670) — a label over equal-width buttons, the chosen one solid, the rest
// secondary. Exactly one is chosen. The numeric Button Group (with the pencil) is its
// own component; this one is for words.

type SegmentedButtonsProps<T extends string> = {
  label: string;
  options: readonly { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
};

export function SegmentedButtons<T extends string>({
  label,
  options,
  value,
  onChange,
}: SegmentedButtonsProps<T>) {
  return (
    <View style={styles.root}>
      <Text style={styles.label}>{label}</Text>
      <View accessibilityRole="radiogroup" style={styles.row}>
        {options.map((o) => (
          <View key={o.value} style={styles.cell}>
            <Button
              onPress={() => onChange(o.value)}
              size="small"
              title={o.label}
              variant={o.value === value ? 'solid' : 'secondary'}
            />
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: 8 },
  label: { ...type.label, color: color.text.secondary },
  row: { flexDirection: 'row', gap: 8 },
  cell: { flex: 1 },
});
