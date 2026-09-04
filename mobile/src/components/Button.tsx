import { Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native';

import { color, type } from '@/theme/tokens';

// Figma: Button component set 20:91 — Size (Large/Small) × Style (Solid/Outline/Ghost/
// Secondary) × State (Default/Pressed/Disabled), 24 variants. Dimensions and colors are
// the frame's values; pressed state comes from Pressable, not a prop.

type ButtonProps = {
  /** The label. Omit it for an icon-only button (the hub's arrow, 34:1520): the icon
   *  alone fills the 48px square, so pass exactly one icon and an accessibilityLabel. */
  title?: string;
  accessibilityLabel?: string;
  onPress?: () => void;
  variant?: 'solid' | 'outline' | 'ghost' | 'secondary';
  size?: 'large' | 'small';
  disabled?: boolean;
  /** Optional icon slots, 24px in the design (nodes 20:49 / 20:47). */
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
};

export function Button({
  title,
  accessibilityLabel,
  onPress,
  variant = 'solid',
  size = 'large',
  disabled = false,
  leftIcon,
  rightIcon,
}: ButtonProps) {
  const frame = (pressed: boolean): ViewStyle[] => {
    const out: ViewStyle[] = [styles.base, size === 'large' ? styles.large : styles.small];
    // Pressed fills per Justin (2026-09-01): Solid → red/200, Secondary → neutral/700.
    // The Figma matrix predates these; 👤 file to be updated to match.
    if (variant === 'solid')
      out.push(disabled ? styles.bgRaised : pressed ? styles.bgBrandPressed : styles.bgBrand);
    if (variant === 'secondary')
      out.push(pressed && !disabled ? styles.bgRaisedPressed : styles.bgRaised);
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
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => frame(pressed)}
    >
      {({ pressed }) => (
        <View style={styles.row}>
          {leftIcon && <View style={title !== undefined && styles.iconLeft}>{leftIcon}</View>}
          {title !== undefined && (
            <Text numberOfLines={1} style={[styles.label, { color: textColor(pressed) }]}>
              {title}
            </Text>
          )}
          {rightIcon && <View style={title !== undefined && styles.iconRight}>{rightIcon}</View>}
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
  // A button label is one line by contract (numberOfLines above). Without it, Android
  // wrapped the second word of a label beside an icon onto a line the 24px box hid —
  // "Add Workout +" rendered as "Add +" (2026-09-02).
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  iconLeft: { marginRight: 10 },
  iconRight: { marginLeft: 10 },
  bgBrand: { backgroundColor: color.brand },
  bgBrandPressed: { backgroundColor: color.press.brand },
  bgRaised: { backgroundColor: color.bg.raised },
  bgRaisedPressed: { backgroundColor: color.press.raised },
  borderDefault: { borderWidth: 1, borderColor: color.text.onButton },
  borderBrand: { borderWidth: 1, borderColor: color.brand },
  borderDisabled: { borderWidth: 1, borderColor: color.text.disabled },
  label: type.button,
});
