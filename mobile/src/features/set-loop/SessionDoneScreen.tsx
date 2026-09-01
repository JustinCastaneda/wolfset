import { StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/Button';
import { color, type } from '@/theme/tokens';
import { formatClock, sessionTotals } from './session-ui';
import type { SessionState } from './types';

// Session Done (watch Summary 164:4712's stat list, phone-sized): time, total weight,
// sets, then Finish back to the tiles. Avg heart rate joins when HR lands.

export function SessionDoneScreen({
  state,
  startedAt,
  now,
  onLeave,
}: {
  state: SessionState;
  startedAt: number;
  now: number;
  onLeave: () => void;
}) {
  const { volume, sets } = sessionTotals(state);
  const seconds = Math.max(0, now - startedAt) / 1000;
  return (
    <View style={styles.root}>
      <View style={styles.center}>
        <Text style={styles.title}>Session Done</Text>
        <Stat label="Time" value={formatClock(seconds)} />
        <Stat label="Total Weight" value={volume.toLocaleString('en-US')} />
        <Stat label="Sets" value={String(sets)} />
        {state.phase.name === 'done' && state.phase.endedEarly && (
          <Text style={styles.early}>Ended early — unfinished lifts count as failures</Text>
        )}
      </View>
      <View style={styles.bottomBar}>
        <Button onPress={onLeave} title="Finish" />
      </View>
    </View>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.statRow}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', paddingHorizontal: 24, gap: 16 },
  title: { ...type.h1, color: color.text.primary, textAlign: 'center', marginBottom: 24 },
  statRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  statLabel: { ...type.h3, color: color.text.secondary },
  statValue: { ...type.h3Bold, color: color.text.primary },
  early: { ...type.bodyLight, color: color.warning, textAlign: 'center', marginTop: 16 },
  bottomBar: { paddingHorizontal: 24, paddingBottom: 40, paddingTop: 12 },
});
