import { Minus, Plus } from 'lucide-react-native';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Button } from './Button';
import { color, type } from '@/theme/tokens';

// Figma: the Weight / Height "K/V" rows on Personal Info (433:27499, 433:27627) — a label
// in the 20px semibold, then minus · value (h1) · plus. The value arrives formatted; the
// parent owns the number and the unit, this only draws and reports taps. With
// `onPressValue` the big number is a button too — the parent opens the Number Sheet
// (Justin, 2026-09-04: tapping the value summons the drawer, as on Add Exercise Details).

type StepperProps = {
  label: string;
  value: string;
  onDecrement: () => void;
  onIncrement: () => void;
  onPressValue?: () => void;
};

export function Stepper({ label, value, onDecrement, onIncrement, onPressValue }: StepperProps) {
  return (
    <View style={styles.root}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.row}>
        <Button
          accessibilityLabel={`Decrease ${label}`}
          leftIcon={<Minus color={color.text.onButton} size={24} />}
          onPress={onDecrement}
          size="small"
          variant="secondary"
        />
        <Pressable
          accessibilityHint={onPressValue ? 'Opens the keypad' : undefined}
          accessibilityRole={onPressValue ? 'button' : undefined}
          disabled={!onPressValue}
          onPress={onPressValue}
          style={({ pressed }) => [styles.valueBox, pressed && styles.valuePressed]}
        >
          <Text numberOfLines={1} style={styles.value}>
            {value}
          </Text>
        </Pressable>
        <Button
          accessibilityLabel={`Increase ${label}`}
          leftIcon={<Plus color={color.text.onButton} size={24} />}
          onPress={onIncrement}
          size="small"
          variant="secondary"
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: 12 },
  // The frame's 20px semibold has no type token of its own (it is the button style at
  // the button's 24 leading).
  label: { ...type.button, color: color.text.secondary },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  valueBox: { flexShrink: 1, paddingHorizontal: 12, borderRadius: 8 },
  valuePressed: { backgroundColor: color.bg.raised },
  value: { ...type.h1, color: color.text.primary, textAlign: 'center' },
});
