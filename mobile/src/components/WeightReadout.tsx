import { StyleSheet, Text, View } from 'react-native';

import { color, type } from '@/theme/tokens';

// The large weight numeral (Edit Weights screens, node 34:965): Display XL value with
// an H3 context line. The file's color language: an *increase* renders warning yellow
// (careful — heavier), a *decrease* renders success green (34:960 vs 34:1236); the
// numeral itself takes the delta's color while editing, text.primary when unchanged.

type WeightReadoutProps = {
  value: number;
  unit: 'Lbs' | 'Kgs';
  /** The weight this replaces — shows "Was N" and the signed delta when different. */
  was?: number;
};

export function WeightReadout({ value, unit, was }: WeightReadoutProps) {
  const delta = was === undefined ? 0 : value - was;
  const deltaColor = delta > 0 ? color.warning : color.success;
  const valueColor = delta === 0 ? color.text.primary : deltaColor;
  return (
    <View style={styles.root}>
      <Text style={[styles.value, { color: valueColor }]}>{formatWeight(value)}</Text>
      <Text style={styles.context}>
        {unit}
        {was !== undefined && delta !== 0 && (
          <>
            {` • Was ${formatWeight(was)} `}
            <Text style={[styles.delta, { color: deltaColor }]}>
              {delta > 0 ? '+' : '−'}
              {formatWeight(Math.abs(delta))}
            </Text>
          </>
        )}
      </Text>
    </View>
  );
}

// 122.5 shows as "122.5", 120 as "120" — plates say ".5", never ".50".
function formatWeight(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}

const styles = StyleSheet.create({
  root: { alignItems: 'center', gap: 4 },
  value: type.displayXl,
  context: { ...type.h3, color: color.text.secondary },
  delta: type.h3Bold,
});
