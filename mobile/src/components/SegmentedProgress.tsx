import { StyleSheet, View } from 'react-native';

import { color } from '@/theme/tokens';

// The Sets bar (node 93:479 on the Post Set Timer): one segment per prescribed set,
// 8px tall, radius 4, gap 8. Done sets brand red, the current set red/200, the rest
// the border gray.

type SegmentedProgressProps = {
  total: number;
  done: number;
  /** Highlight the segment after the done ones as "current". On by default. */
  showCurrent?: boolean;
  /** Which segment is current; defaults to the one after the done ones. A skipped set
   *  leaves a gap, so the loop passes its own set index. */
  current?: number;
};

export function SegmentedProgress({
  total,
  done,
  showCurrent = true,
  current = done,
}: SegmentedProgressProps) {
  return (
    <View style={styles.row}>
      {Array.from({ length: total }, (_, i) => {
        const fill =
          i < done
            ? color.setsBar.done
            : showCurrent && i === current
              ? color.setsBar.current
              : color.setsBar.upcoming;
        return <View key={i} style={[styles.segment, { backgroundColor: fill }]} />;
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 8, alignSelf: 'stretch' },
  segment: { flex: 1, height: 8, borderRadius: 4 },
});
