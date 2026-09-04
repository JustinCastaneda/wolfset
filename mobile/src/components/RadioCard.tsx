import { Check } from 'lucide-react-native';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { color, type } from '@/theme/tokens';

// Figma: Radio Card component set 359:1726 — Default (359:1725) / Selected (359:1724).
// The "How You Get Stronger", Goal and onboarding cards: raised background, r12, pad 16;
// the selected one gains a brand border and a "Selected" caption in the top-right corner.
// With `checkbox`, the Settings checklist look (Equipment 433:22674, Dumbbell Scale
// 433:22844): a 32px box before the title, brand-filled with a check when selected.
// Who may be selected is the group's business — one for a radio, any number for a
// checklist; the card just draws it.

type RadioCardProps = {
  title: string;
  description?: string;
  selected?: boolean;
  onPress?: () => void;
  /** The corner caption on the selected card (node 359:1714). */
  badge?: string;
  /** The 32px checkmark box before the title (node 433:23133). */
  checkbox?: boolean;
  /** Extra content under the title — Dumbbell Scale's example chips (433:22950). */
  children?: React.ReactNode;
};

export function RadioCard({
  title,
  description,
  selected = false,
  onPress,
  badge = 'Selected',
  checkbox = false,
  children,
}: RadioCardProps) {
  return (
    <Pressable
      accessibilityRole={checkbox ? 'checkbox' : 'radio'}
      accessibilityState={{ selected, checked: checkbox ? selected : undefined }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.root,
        selected && styles.selected,
        pressed && !selected && styles.pressed,
      ]}
    >
      <View style={styles.row}>
        {checkbox && (
          <View style={[styles.box, selected && styles.boxSelected]}>
            {selected && <Check color={color.text.onButton} size={24} />}
          </View>
        )}
        <View style={styles.text}>
          <Text style={styles.title}>{title}</Text>
          {description !== undefined && <Text style={styles.description}>{description}</Text>}
          {children}
        </View>
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
  row: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  box: {
    width: 32,
    height: 32,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: color.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  boxSelected: { borderColor: color.brand, backgroundColor: color.brand },
  text: { gap: 8, flexShrink: 1 },
  title: { ...type.title, color: color.text.primary },
  // Figma leading "normal" on the 16px body ≈ 20px; the token's 16 would stack the two
  // lines of description too tightly.
  description: { ...type.body, lineHeight: 20, color: color.text.secondary },
  badge: { ...type.caption, color: color.brand, position: 'absolute', top: 12, right: 12 },
});
