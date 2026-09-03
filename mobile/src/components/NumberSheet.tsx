import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { BottomSheet } from './BottomSheet';
import { Button } from './Button';
import { Keypad } from './Keypad';
import { applyKey, parseDraft, type NumberMode } from './number-draft';
import { color, type } from '@/theme/tokens';

// A Bottom Drawer with the Keypad for typing one number: the "✎" custom value on a
// Button Group, and the weight readout on Add Exercise Details (Justin, 2026-09-02:
// tapping the big number is Custom, so a strong lifter isn't tapping +5 thirty times).
// ⚠️ The layout inside the drawer is undesigned — Keypad and Buttons until drawn.

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
  return (
    <BottomSheet onDismiss={onCancel} visible={visible}>
      {/* Mounted per opening so the draft always starts empty. */}
      {visible && (
        <Body
          initial={initial}
          label={label}
          max={max}
          min={min}
          mode={mode}
          onCancel={onCancel}
          onSet={onSet}
        />
      )}
    </BottomSheet>
  );
}

function Body({
  label,
  initial,
  mode,
  min,
  max,
  onSet,
  onCancel,
}: Omit<NumberSheetProps, 'visible'> & { min: number }) {
  const [draft, setDraft] = useState('');
  const value = parseDraft(draft);
  const valid = value !== null && value >= min && value <= max;
  return (
    <>
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
    </>
  );
}

const styles = StyleSheet.create({
  title: { ...type.title, color: color.text.primary, paddingHorizontal: 24 },
  value: { ...type.displayL, color: color.text.primary, textAlign: 'center' },
  valuePlaceholder: { color: color.text.muted },
  actions: { flexDirection: 'row', gap: 16, paddingHorizontal: 24 },
  grow: { flex: 1 },
});
