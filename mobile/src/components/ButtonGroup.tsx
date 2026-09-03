import { Pencil } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { NumberSheet } from './NumberSheet';
import { color, type } from '@/theme/tokens';

// Figma: Button Group component set 373:7703 — a label over a row of equal keys
// (State=True 373:7654 brand fill / False 373:7655 raised), the last one a pencil for a
// custom number. A custom value takes the pencil's slot, brand-filled, "32 ✎"
// (Override Applied, 123:1654). The pencil opens the Number Sheet.

type ButtonGroupProps = {
  label: string;
  options: readonly number[];
  value: number;
  onChange: (value: number) => void;
  /** Largest custom number accepted (keeps "sets" from becoming 999). */
  max?: number;
};

export function ButtonGroup({ label, options, value, onChange, max = 99 }: ButtonGroupProps) {
  const [editing, setEditing] = useState(false);
  const custom = !options.includes(value);
  return (
    <View style={styles.root}>
      <Text style={styles.label}>{label}</Text>
      <View accessibilityRole="radiogroup" style={styles.row}>
        {options.map((n) => (
          <Key key={n} onPress={() => onChange(n)} selected={value === n}>
            <Text style={styles.keyLabel}>{n}</Text>
          </Key>
        ))}
        <Key accessibilityLabel="Custom" onPress={() => setEditing(true)} selected={custom}>
          {custom && <Text style={styles.keyLabel}>{value}</Text>}
          <Pencil color={color.text.onButton} size={24} />
        </Key>
      </View>
      <NumberSheet
        initial={value}
        label={label}
        max={max}
        mode="integer"
        onCancel={() => setEditing(false)}
        onSet={(n) => {
          setEditing(false);
          onChange(n);
        }}
        visible={editing}
      />
    </View>
  );
}

function Key({
  selected,
  onPress,
  accessibilityLabel,
  children,
}: {
  selected: boolean;
  onPress: () => void;
  accessibilityLabel?: string;
  children: React.ReactNode;
}) {
  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.key,
        selected ? styles.keySelected : pressed ? styles.keyPressed : null,
      ]}
    >
      {children}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { alignSelf: 'stretch', gap: 8 },
  // Figma 373:7621: Button type, secondary text.
  label: { ...type.button, color: color.text.secondary },
  row: { flexDirection: 'row', gap: 8 },
  // Figma 373:7648: min 48, pad 12, r8, raised; True → brand.
  key: {
    flex: 1,
    minHeight: 48,
    minWidth: 48,
    padding: 12,
    borderRadius: 8,
    flexDirection: 'row',
    gap: 4,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: color.bg.raised,
  },
  keySelected: { backgroundColor: color.brand },
  keyPressed: { backgroundColor: color.press.raised },
  keyLabel: { ...type.button, color: color.text.onButton },
});
