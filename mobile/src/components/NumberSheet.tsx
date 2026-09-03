import { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from './Button';
import { Keypad } from './Keypad';
import { applyKey, parseDraft, type NumberMode } from './number-draft';
import { color, type } from '@/theme/tokens';

// A bottom sheet with the Keypad for typing one number: the "✎" custom value on a
// Button Group, and the weight readout on Add Exercise Details (Justin, 2026-09-02:
// tapping the big number is Custom, so a strong lifter isn't tapping +5 thirty times).
// ⚠️ Undesigned — the Keypad and Buttons in a plain sheet until Justin draws it.

type NumberSheetProps = {
  visible: boolean;
  label: string;
  /** Shown until the first key: the value being replaced. */
  initial: number;
  mode: NumberMode;
  min?: number;
  max: number;
  onSet: (value: number) => void;
  onCancel: () => void;
};

export function NumberSheet({
  visible,
  label,
  initial,
  mode,
  min = 1,
  max,
  onSet,
  onCancel,
}: NumberSheetProps) {
  // Remount per opening so the draft always starts empty.
  return (
    <Modal animationType="slide" onRequestClose={onCancel} transparent visible={visible}>
      <Pressable accessibilityLabel="Cancel" onPress={onCancel} style={styles.scrim} />
      {visible && (
        <Sheet
          initial={initial}
          label={label}
          max={max}
          min={min}
          mode={mode}
          onCancel={onCancel}
          onSet={onSet}
        />
      )}
    </Modal>
  );
}

function Sheet({
  label,
  initial,
  mode,
  min,
  max,
  onSet,
  onCancel,
}: Omit<NumberSheetProps, 'visible'> & { min: number }) {
  const insets = useSafeAreaInsets();
  const [draft, setDraft] = useState('');
  const value = parseDraft(draft);
  const valid = value !== null && value >= min && value <= max;
  return (
    <View style={[styles.sheet, { paddingBottom: insets.bottom + 24 }]}>
      <Text style={styles.title}>{label}</Text>
      <Text style={[styles.value, draft === '' && styles.valuePlaceholder]}>
        {draft === '' ? initial : draft}
      </Text>
      <Keypad onKey={(k) => setDraft((d) => applyKey(d, k, mode))} />
      <View style={styles.actions}>
        <View style={styles.grow}>
          <Button onPress={onCancel} title="Cancel" variant="secondary" />
        </View>
        <View style={styles.grow}>
          <Button disabled={!valid} onPress={() => valid && onSet(value)} title="Set" />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  scrim: { flex: 1 },
  sheet: {
    backgroundColor: color.bg.base,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 24,
    gap: 16,
  },
  title: { ...type.title, color: color.text.primary, paddingHorizontal: 24 },
  value: { ...type.displayL, color: color.text.primary, textAlign: 'center' },
  valuePlaceholder: { color: color.text.muted },
  actions: { flexDirection: 'row', gap: 16, paddingHorizontal: 24 },
  grow: { flex: 1 },
});
