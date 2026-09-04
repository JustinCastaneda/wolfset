import { Pressable, StyleSheet, Text, View } from 'react-native';

import { color, type } from '@/theme/tokens';

// Figma: Icon Card (34:1591 and siblings on the home hub 34:1464) — a raised r12 tile,
// pad 24, a 32px icon over a two-line body label. The hub lays four of them out two
// per row; each takes half the row. A tile whose destination isn't built yet renders
// disabled (icon and label in the disabled text color, as the file's disabled button).

type IconCardProps = {
  /** A 32px glyph — lucide, colored by the caller to match `disabled`. */
  icon: React.ReactNode;
  label: string;
  onPress?: () => void;
  disabled?: boolean;
};

export function IconCard({ icon, label, onPress, disabled = false }: IconCardProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [styles.root, pressed && !disabled && styles.pressed]}
    >
      <View style={styles.icon}>{icon}</View>
      <Text numberOfLines={2} style={[styles.label, disabled && styles.labelDisabled]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    padding: 24,
    gap: 20,
    borderRadius: 12,
    backgroundColor: color.bg.raised,
  },
  pressed: { backgroundColor: color.press.raised },
  icon: { width: 32, height: 32 },
  label: { ...type.body, color: color.text.primary },
  labelDisabled: { color: color.text.disabled },
});
