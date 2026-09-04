import { Minus, Plus } from 'lucide-react-native';
import { StyleSheet, Text, View } from 'react-native';

import { Button } from './Button';
import { color, type } from '@/theme/tokens';

// Figma: the Weight / Height "K/V" rows on Personal Info (433:27499, 433:27627) — a label
// in the 20px semibold, then minus · value (h1) · plus. The value arrives formatted; the
// parent owns the number and the unit, this only draws and reports taps.

type StepperProps = {
  label: string;
  value: string;
  onDecrement: () => void;
  onIncrement: () => void;
};

export function Stepper({ label, value, onDecrement, onIncrement }: StepperProps) {
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
        <Text numberOfLines={1} style={styles.value}>
          {value}
        </Text>
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
  value: { ...type.h1, color: color.text.primary, textAlign: 'center', flexShrink: 1 },
});
