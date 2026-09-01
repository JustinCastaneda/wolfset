import { Pressable, StyleSheet, Text, View } from 'react-native';

import { color, type } from '@/theme/tokens';

// Figma: Chip component set 48:579 — Style (Brand/Muted/Outline) × Size × Pressed.
// The Pressed=True variants are the *selected* look (filled), so the prop is `selected`.
//
// Press feedback (Justin, 2026-09-01 — not in the file, mirrors the buttons' logic:
// red things go darker, gray things go lighter): brand → red/200 fill; muted/outline
// step one neutral lighter than their current fill. Only when `onPress` makes the chip
// toggleable; a chip without `onPress` is a static label with no press state.

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
  const frame = (pressed: boolean) => [
    styles.base,
    size === 'large' ? styles.large : styles.small,
    variant === 'brand' &&
      (pressed ? styles.brandPressed : selected ? styles.brandSelected : styles.brandIdle),
    variant === 'muted' &&
      (pressed
        ? selected
          ? styles.mutedSelectedPressed
          : styles.mutedPressed
        : selected
          ? styles.mutedSelected
          : styles.mutedIdle),
    variant === 'outline' &&
      (pressed
        ? selected
          ? styles.outlineSelectedPressed
          : styles.outlinePressed
        : selected
          ? styles.outlineSelected
          : styles.outlineIdle),
  ];
  const textColor = (pressed: boolean) =>
    pressed && variant === 'brand'
      ? color.text.onButton
      : selected
        ? variant === 'outline'
          ? color.text.primary
          : color.text.onButton
        : variant === 'brand'
          ? color.brand
          : color.text.secondary;

  const body = (pressed: boolean) => (
    <Text
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
  brandSelected: { backgroundColor: color.brand, borderColor: color.brand },
  brandPressed: { backgroundColor: color.press.brand, borderColor: color.press.brand },
  mutedIdle: { backgroundColor: color.bg.raised, borderColor: color.border },
  mutedSelected: { backgroundColor: color.border, borderColor: color.border },
  mutedPressed: { backgroundColor: color.press.raised, borderColor: color.press.raised },
  mutedSelectedPressed: {
    backgroundColor: color.press.raisedSelected,
    borderColor: color.press.raisedSelected,
  },
  outlineIdle: { borderColor: color.border },
  outlineSelected: { backgroundColor: color.bg.raised, borderColor: color.border },
  outlinePressed: { backgroundColor: color.bg.raised, borderColor: color.border },
  outlineSelectedPressed: { backgroundColor: color.press.raised, borderColor: color.press.raised },
  labelSmall: type.caption,
  labelLarge: type.body,
});
