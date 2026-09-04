import { ChevronRight } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { Animated, StyleSheet, View } from 'react-native';

import { color } from '@/theme/tokens';

// The chevron at the end of a list row, in the frame's 48px ghost-button slot
// (433:22598, 443:7341). Rows sit flush on the background — a pressed row paints no
// fill, since it would cover the watermark (Justin, 2026-09-04) — so the press shows
// here instead: the chevron fades from white to brand while the finger is down. Two
// glyphs stacked, the brand one fading in, because an icon's color cannot animate.

type RowChevronProps = {
  pressed: boolean;
  /** The row goes nowhere yet: the file's disabled color, no press. */
  disabled?: boolean;
};

export function RowChevron({ pressed, disabled = false }: RowChevronProps) {
  const [brand] = useState(() => new Animated.Value(0));
  useEffect(() => {
    Animated.timing(brand, {
      toValue: pressed ? 1 : 0,
      duration: pressed ? 80 : 160,
      useNativeDriver: true,
    }).start();
  }, [brand, pressed]);
  if (disabled) {
    return (
      <View style={styles.slot}>
        <ChevronRight color={color.text.disabled} size={24} />
      </View>
    );
  }
  return (
    <View style={styles.slot}>
      <ChevronRight color={color.text.primary} size={24} />
      <Animated.View style={[styles.overlay, { opacity: brand }]}>
        <ChevronRight color={color.brand} size={24} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  slot: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
