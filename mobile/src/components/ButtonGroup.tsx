import { Pencil } from 'lucide-react-native';
import { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from './Button';
import { Keypad, type KeypadKey } from './Keypad';
import { color, type } from '@/theme/tokens';

// Figma: Button Group component set 373:7703 — a label over a row of equal keys
// (State=True 373:7654 brand fill / False 373:7655 raised), the last one a pencil for a
// custom number. A custom value takes the pencil's slot, brand-filled, "32 ✎"
// (Override Applied, 123:1654). ⚠️ The custom-entry sheet itself is undesigned — the
// Keypad and a Set button in a bottom sheet until Justin draws it.

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
      <CustomSheet
        initial={value}
        label={label}
        max={max}
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

function CustomSheet({
  visible,
  label,
  initial,
  max,
  onSet,
  onCancel,
}: {
  visible: boolean;
  label: string;
  initial: number;
  max: number;
  onSet: (n: number) => void;
  onCancel: () => void;
}) {
  const insets = useSafeAreaInsets();
  const [draft, setDraft] = useState('');
  const onKey = (k: KeypadKey) => {
    if (k === 'delete') return setDraft((d) => d.slice(0, -1));
    if (k === '.') return; // whole numbers only here
    setDraft((d) => (d + k).replace(/^0+(?=\d)/, '').slice(0, 3));
  };
  const n = draft === '' ? NaN : Number(draft);
  const valid = Number.isInteger(n) && n >= 1 && n <= max;
  return (
    <Modal animationType="slide" onRequestClose={onCancel} transparent visible={visible}>
      <Pressable accessibilityLabel="Cancel" onPress={onCancel} style={styles.scrim} />
      <View style={[styles.sheet, { paddingBottom: insets.bottom + 24 }]}>
        <Text style={styles.sheetTitle}>{label}</Text>
        <Text style={styles.sheetValue}>{draft === '' ? initial : draft}</Text>
        <Keypad onKey={onKey} />
        <View style={styles.sheetActions}>
          <View style={styles.grow}>
            <Button onPress={onCancel} title="Cancel" variant="secondary" />
          </View>
          <View style={styles.grow}>
            <Button disabled={!valid} onPress={() => valid && onSet(n)} title="Set" />
          </View>
        </View>
      </View>
    </Modal>
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
  scrim: { flex: 1 },
  sheet: {
    backgroundColor: color.bg.base,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 24,
    gap: 16,
  },
  sheetTitle: { ...type.title, color: color.text.primary, paddingHorizontal: 24 },
  sheetValue: { ...type.displayL, color: color.text.primary, textAlign: 'center' },
  sheetActions: { flexDirection: 'row', gap: 16, paddingHorizontal: 24 },
  grow: { flex: 1 },
});
