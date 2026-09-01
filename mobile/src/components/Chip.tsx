import { StyleSheet, Text, View } from 'react-native';

import { color, type } from '@/theme/tokens';

// Figma: Chip component set 48:579 — Style (Brand/Muted/Outline) × Size × Pressed.
// The Pressed=True variants are the *selected* look (filled), so the prop is `selected`.

type ChipProps = {
  label: string;
  variant?: 'brand' | 'muted' | 'outline';
  size?: 'large' | 'small';
  selected?: boolean;
};

export function Chip({ label, variant = 'muted', size = 'small', selected = false }: ChipProps) {
  const frame = [
    styles.base,
    size === 'large' ? styles.large : styles.small,
    variant === 'brand' && (selected ? styles.brandSelected : styles.brandIdle),
    variant === 'muted' && (selected ? styles.mutedSelected : styles.mutedIdle),
    variant === 'outline' && (selected ? styles.outlineSelected : styles.outlineIdle),
  ];
  const textColor = selected
    ? variant === 'outline'
      ? color.text.primary
      : color.text.onButton
    : variant === 'brand'
      ? color.brand
      : color.text.secondary;

  return (
    <View style={frame}>
      <Text
        style={[size === 'large' ? styles.labelLarge : styles.labelSmall, { color: textColor }]}
      >
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  base: { alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  // Figma: Small pad 8×4 / r12; Large pad 16×8 / r24.
  small: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  large: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 24 },
  brandIdle: { borderColor: color.brand },
  brandSelected: { backgroundColor: color.brand, borderColor: color.brand },
  mutedIdle: { backgroundColor: color.bg.raised, borderColor: color.border },
  mutedSelected: { backgroundColor: color.border, borderColor: color.border },
  outlineIdle: { borderColor: color.border },
  outlineSelected: { backgroundColor: color.bg.raised, borderColor: color.border },
  labelSmall: type.caption,
  labelLarge: type.body,
});
