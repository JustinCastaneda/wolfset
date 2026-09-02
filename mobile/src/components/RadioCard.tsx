import { Pressable, StyleSheet, Text, View } from 'react-native';

import { color, type } from '@/theme/tokens';

// Figma: Radio Card component set 359:1726 — Default (359:1725) / Selected (359:1724).
// The "How You Get Stronger" and onboarding cards: raised background, r12, pad 16; the
// selected one gains a brand border and a "Selected" caption in the top-right corner.
// Exactly one card in a group is selected — the group owns that, the card just draws it.

type RadioCardProps = {
  title: string;
  description: string;
  selected?: boolean;
  onPress?: () => void;
  /** The corner caption on the selected card (node 359:1714). */
  badge?: string;
};

export function RadioCard({
  title,
  description,
  selected = false,
  onPress,
  badge = 'Selected',
}: RadioCardProps) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.root,
        selected && styles.selected,
        pressed && !selected && styles.pressed,
      ]}
    >
      <View style={styles.text}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.description}>{description}</Text>
      </View>
      {selected && <Text style={styles.badge}>{badge}</Text>}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: {
    alignSelf: 'stretch',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    // Same color as the fill until selected, so the border never shifts the layout.
    borderColor: color.bg.raised,
    backgroundColor: color.bg.raised,
  },
  selected: { borderColor: color.brand },
  pressed: { backgroundColor: color.press.raised, borderColor: color.press.raised },
  text: { gap: 8 },
  title: { ...type.title, color: color.text.primary },
  // Figma leading "normal" on the 16px body ≈ 20px; the token's 16 would stack the two
  // lines of description too tightly.
  description: { ...type.body, lineHeight: 20, color: color.text.secondary },
  badge: { ...type.caption, color: color.brand, position: 'absolute', top: 12, right: 12 },
});
