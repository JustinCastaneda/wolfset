import { Pressable, StyleSheet, Text, View } from 'react-native';

import { color, type } from '@/theme/tokens';

// Figma: Top Bar component set 34:1392 — Default (centered title, slots both sides) and
// Left-Aligned (title leads, right slot only). Slot buttons are 48px ghost icon targets.
// Icons themselves arrive with the icon-set decision (#10); the slots take any node.

type TopBarProps = {
  title: string;
  align?: 'center' | 'left';
  left?: React.ReactNode;
  right?: React.ReactNode;
  onPressLeft?: () => void;
  onPressRight?: () => void;
};

export function TopBar({
  title,
  align = 'center',
  left,
  right,
  onPressLeft,
  onPressRight,
}: TopBarProps) {
  return (
    <View style={[styles.root, align === 'left' ? styles.rootLeft : styles.rootCenter]}>
      {align === 'center' && <Slot onPress={onPressLeft}>{left}</Slot>}
      <View style={styles.titleBox}>
        <Text numberOfLines={1} style={[styles.title, align === 'center' && styles.titleCentered]}>
          {title}
        </Text>
      </View>
      <Slot onPress={onPressRight}>{right}</Slot>
    </View>
  );
}

// The file's slot: min 48×48, pad 12, r8 — a ghost icon button (node 34:814).
function Slot({ children, onPress }: { children?: React.ReactNode; onPress?: () => void }) {
  return (
    <Pressable
      accessibilityRole={children ? 'button' : undefined}
      disabled={!children}
      onPress={onPress}
      style={({ pressed }) => [styles.slot, pressed && children ? styles.slotPressed : null]}
    >
      {children}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  // Figma: pt32 pb12; Default px12, Left-Aligned pl24 pr12.
  root: { flexDirection: 'row', alignItems: 'center', paddingTop: 32, paddingBottom: 12 },
  rootCenter: { paddingHorizontal: 12 },
  rootLeft: { paddingLeft: 24, paddingRight: 12 },
  titleBox: { flex: 1, height: 48, justifyContent: 'center' },
  title: { ...type.body, lineHeight: 24, color: color.text.secondary },
  titleCentered: { textAlign: 'center' },
  slot: {
    minWidth: 48,
    minHeight: 48,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  slotPressed: { backgroundColor: color.bg.raised },
});
