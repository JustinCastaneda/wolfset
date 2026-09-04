import { Pressable, StyleSheet, Text, View } from 'react-native';

import { color, type } from '@/theme/tokens';

// Figma: Chip component set 48:579 — Style (Brand/Muted/Outline) × Size × Pressed.
// The Pressed=True variants are the *selected* look (filled), so the prop is `selected`.
//
// Press feedback comes straight from the file: the Pressed=True variants (78:593…608)
// are the pressed look, and it is the same as the selected look — pressing previews the
// fill. Only when `onPress` makes the chip toggleable; a chip without `onPress` is a
// static label with no press state. (Corrected 2026-09-02 — an earlier round invented
// darker/lighter shades before Justin found the file already had these.)

type ChipProps = {
  label: string;
  variant?: 'brand' | 'muted' | 'outline';
  size?: 'large' | 'small';
  selected?: boolean;
  /** Makes the chip toggleable: pressable, with press feedback and a button role. */
  onPress?: () => void;
};

export function Chip({
  label,
  variant = 'muted',
  size = 'small',
  selected = false,
  onPress,
}: ChipProps) {
  const frame = (pressed: boolean) => {
    const filled = pressed || selected;
    return [
      styles.base,
      size === 'large' ? styles.large : styles.small,
      variant === 'brand' && (filled ? styles.brandFilled : styles.brandIdle),
      variant === 'muted' && (filled ? styles.mutedFilled : styles.mutedIdle),
      variant === 'outline' && (filled ? styles.outlineFilled : styles.outlineIdle),
    ];
  };
  const textColor = (pressed: boolean) =>
    pressed || selected
      ? variant === 'outline'
        ? color.text.primary
        : color.text.onButton
      : variant === 'brand'
        ? color.brand
        : color.text.secondary;

  // One line, always: a chip re-rendered in place on Android wrapped its last word onto
  // a hidden second line ("Workout A" → "Workout", the home day chips, 2026-09-03).
  const body = (pressed: boolean) => (
    <Text
      numberOfLines={1}
      style={[
        size === 'large' ? styles.labelLarge : styles.labelSmall,
        { color: textColor(pressed) },
      ]}
    >
      {label}
    </Text>
  );

  if (!onPress) return <View style={frame(false)}>{body(false)}</View>;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => frame(pressed)}
    >
      {({ pressed }) => body(pressed)}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: { alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  // Figma: Small pad 8×4 / r12; Large pad 16×8 / r24.
  small: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  large: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 24 },
  brandIdle: { borderColor: color.brand },
  brandFilled: { backgroundColor: color.brand, borderColor: color.brand },
  mutedIdle: { backgroundColor: color.bg.raised, borderColor: color.border },
  mutedFilled: { backgroundColor: color.border, borderColor: color.border },
  outlineIdle: { borderColor: color.border },
  outlineFilled: { backgroundColor: color.bg.raised, borderColor: color.border },
  labelSmall: type.caption,
  labelLarge: type.body,
});
