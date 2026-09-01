import { Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native';

import { color, type } from '@/theme/tokens';

// Figma: Button component set 20:91 — Size (Large/Small) × Style (Solid/Outline/Ghost/
// Secondary) × State (Default/Pressed/Disabled), 24 variants. Dimensions and colors are
// the frame's values; pressed state comes from Pressable, not a prop.

type ButtonProps = {
  title: string;
  onPress?: () => void;
  variant?: 'solid' | 'outline' | 'ghost' | 'secondary';
  size?: 'large' | 'small';
  disabled?: boolean;
  /** Optional icon slots, 24px in the design (nodes 20:49 / 20:47). */
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
};

// Pressed Secondary layers 10% white over the raised background (Figma node 34:1098's
// gradient). An effect of the press, not a design token.
const PRESSED_OVERLAY = 'rgba(255, 255, 255, 0.1)';

export function Button({
  title,
  onPress,
  variant = 'solid',
  size = 'large',
  disabled = false,
  leftIcon,
  rightIcon,
}: ButtonProps) {
  const frame = (pressed: boolean): ViewStyle[] => {
    const out: ViewStyle[] = [styles.base, size === 'large' ? styles.large : styles.small];
    if (variant === 'solid') out.push(disabled ? styles.bgRaised : styles.bgBrand);
    if (variant === 'secondary') {
      out.push(styles.bgRaised);
      if (pressed && !disabled) out.push(styles.pressedOverlay);
    }
    if (variant === 'ghost' && pressed && !disabled) out.push(styles.bgRaised);
    if (variant === 'outline') {
      out.push(
        disabled ? styles.borderDisabled : pressed ? styles.borderBrand : styles.borderDefault,
      );
    }
    return out;
  };

  const textColor = (pressed: boolean) =>
    disabled
      ? color.text.disabled
      : variant === 'outline' && pressed
        ? color.brand
        : color.text.onButton;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => frame(pressed)}
    >
      {({ pressed }) => (
        <View style={styles.row}>
          {leftIcon}
          <Text style={[styles.label, { color: textColor(pressed) }]}>{title}</Text>
          {rightIcon}
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: { alignItems: 'center', justifyContent: 'center', borderRadius: 8 },
  // Figma: Large minH 64 / pad 20; Small minH 48 / pad 12 — both clear the 44px floor.
  large: { minHeight: 64, minWidth: 64, padding: 20 },
  small: { minHeight: 48, minWidth: 48, padding: 12 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  bgBrand: { backgroundColor: color.brand },
  bgRaised: { backgroundColor: color.bg.raised },
  pressedOverlay: { backgroundColor: PRESSED_OVERLAY },
  borderDefault: { borderWidth: 1, borderColor: color.text.onButton },
  borderBrand: { borderWidth: 1, borderColor: color.brand },
  borderDisabled: { borderWidth: 1, borderColor: color.text.disabled },
  label: type.button,
});
