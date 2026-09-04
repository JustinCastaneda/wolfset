import { Pressable, StyleSheet, Text, View } from 'react-native';

import { color, type } from '@/theme/tokens';

// Figma: the Line-Item of the Workout Summary (123:3072, on 34:778 and 384:11481) — a
// 24px indicator slot (the row number, or the in-flight check / dots / wheel), the lift's
// name over a caption, and the weight beside its sets×reps on the right. The Day
// Overview lists a day before it starts; the mid-workout overview draws the same row
// with progress in the slot. Pressable only when given onPress.

type ExerciseRowProps = {
  /** What sits in the 24px slot: a number before the workout, progress during it. */
  indicator: React.ReactNode;
  title: string;
  caption: React.ReactNode;
  weight: number;
  /** "5x5", or "3 sets" for an open-ended lift. */
  rx: string;
  /** The lift the session is on: raised, as the frame highlights it. */
  current?: boolean;
  onPress?: () => void;
};

export function ExerciseRow({
  indicator,
  title,
  caption,
  weight,
  rx,
  current = false,
  onPress,
}: ExerciseRowProps) {
  return (
    <Pressable
      accessibilityRole={onPress ? 'button' : undefined}
      disabled={!onPress}
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        current && styles.rowCurrent,
        pressed && onPress !== undefined && styles.rowPressed,
      ]}
    >
      <View style={styles.left}>
        <View style={styles.indicatorBox}>{indicator}</View>
        <View style={styles.text}>
          <Text style={styles.title}>{title}</Text>
          {typeof caption === 'string' ? <Text style={styles.caption}>{caption}</Text> : caption}
        </View>
      </View>
      <View style={styles.right}>
        <Text style={styles.weight}>{weight}</Text>
        <Text style={styles.rx}>{rx}</Text>
      </View>
    </Pressable>
  );
}

/** The row number for a lift that has not started (123:3075). */
export function RowNumber({ n }: { n: number }) {
  return <Text style={styles.number}>{n}</Text>;
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
    marginBottom: 3,
  },
  rowCurrent: { backgroundColor: color.bg.raised },
  rowPressed: { backgroundColor: color.press.raised },
  indicatorBox: { minWidth: 28, alignItems: 'center' },
  left: { flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 1 },
  number: { ...type.title, color: color.text.secondary, width: 24, textAlign: 'center' },
  text: { gap: 4, flexShrink: 1 },
  title: { ...type.title, color: color.text.primary },
  caption: { ...type.caption, color: color.text.secondary },
  right: { flexDirection: 'row', alignItems: 'baseline', gap: 4 },
  weight: { ...type.titleValue, color: color.text.primary },
  rx: { ...type.label, color: color.text.secondary },
});
