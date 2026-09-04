import { StyleSheet, Text, View } from 'react-native';

import { WEEKDAYS } from '@/lib/plan-week';
import { color, type } from '@/theme/tokens';

// Figma: Suggested Week — the same "Button Group" on Plan Summary (123:2979) and the home
// hub (433:22649): seven r12 tiles, weekday over the day letter, a brand border on
// training days and a muted dot on rest days. A suggestion only — nothing is scheduled.

type WeekStripProps = {
  /** One entry per weekday, Mon first: the day letter to train, or null to rest. */
  week: (string | null)[];
};

export function WeekStrip({ week }: WeekStripProps) {
  return (
    <View style={styles.root}>
      <Text style={styles.label}>Suggested Week</Text>
      <View style={styles.row}>
        {WEEKDAYS.map((name, i) => {
          const letter = week[i] ?? null;
          return (
            <View key={name} style={[styles.tile, letter !== null && styles.tileActive]}>
              <Text numberOfLines={1} style={styles.day}>
                {name}
              </Text>
              <Text style={[styles.letter, letter === null && styles.rest]}>{letter ?? '•'}</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { paddingHorizontal: 24, gap: 8 },
  label: { ...type.label, color: color.text.secondary },
  row: { flexDirection: 'row', gap: 8 },
  // Seven across at 412 leaves ~45 each: the frame's p12 would squeeze "Mon" to two
  // lines on a real phone, so the sides go to 4 and the vertical keeps the frame's 12.
  tile: {
    flex: 1,
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: color.border,
  },
  tileActive: { borderColor: color.brand },
  day: { ...type.caption, color: color.text.primary },
  letter: { ...type.label, color: color.text.primary },
  rest: { color: color.border },
});
