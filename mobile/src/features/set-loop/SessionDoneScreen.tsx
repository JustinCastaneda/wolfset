import { Check, X } from 'lucide-react-native';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/Button';
import { color, type } from '@/theme/tokens';
import { formatClock, sessionTotals } from './session-ui';
import type { SettledExercise } from './settle-session';
import type { SessionState } from './types';

// Session Done — no phone frame exists yet; stat list from the watch Summary
// (164:4712), left-aligned like every phone screen. Now also the progression readout:
// each lift's verdict and next weight, plus the plateau question when a streak hits
// the threshold (decisions 11b: the app asks, never decides). ⚠️ The plateau row is
// UNDESIGNED — minimal until Justin draws it.

export function SessionDoneScreen({
  state,
  startedAt,
  now,
  avgBpm,
  summary,
  onAcceptDeload,
  onKeepWeight,
  onLeave,
}: {
  state: SessionState;
  startedAt: number;
  now: number;
  /** The session's average heart rate; null when no watch streamed. */
  avgBpm: number | null;
  summary: SettledExercise[] | null;
  onAcceptDeload: (exerciseId: string) => void;
  onKeepWeight: (exerciseId: string) => void;
  onLeave: () => void;
}) {
  const { volume, sets } = sessionTotals(state);
  const seconds = Math.max(0, now - startedAt) / 1000;
  return (
    <View style={styles.root}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.title}>Session Done</Text>
        <Stat label="Time" value={formatClock(seconds)} />
        <Stat label="Total Weight" value={volume.toLocaleString('en-US')} />
        {avgBpm !== null && <Stat label="Avg. Heart rate" value={String(Math.round(avgBpm))} />}
        <Stat label="Sets" value={String(sets)} />

        {summary && (
          <View style={styles.lifts}>
            <Text style={styles.section}>Next session</Text>
            {summary.map((s) => (
              <View key={s.exerciseId} style={styles.liftRow}>
                <View style={styles.liftLeft}>
                  {s.outcome === 'hit' ? (
                    <Check color={color.success} size={20} />
                  ) : s.outcome === 'failed' ? (
                    <X color={color.warning} size={20} />
                  ) : (
                    <Text style={styles.skipMark}>–</Text>
                  )}
                  <Text style={styles.liftName}>{s.name}</Text>
                </View>
                {s.plateau ? null : s.nextWeight !== s.prevWeight ? (
                  <Text style={styles.liftChange}>
                    {s.prevWeight} → <Text style={styles.up}>{s.nextWeight}</Text>
                  </Text>
                ) : s.nextReps !== s.prevReps ? (
                  <Text style={styles.liftChange}>
                    {s.prevReps} → <Text style={styles.up}>{s.nextReps}</Text> reps
                  </Text>
                ) : (
                  <Text style={styles.liftHold}>{s.nextWeight}</Text>
                )}
                {s.offerSteady && (
                  <Text style={styles.offerSteady}>
                    Unrated two sessions — consider switching this lift to Steady
                  </Text>
                )}
                {s.plateau && (
                  <View style={styles.plateau}>
                    <Text style={styles.plateauText}>2 in a row below target</Text>
                    <View style={styles.plateauButtons}>
                      <PlateauKey
                        label={`Keep ${s.prevWeight}`}
                        onPress={() => onKeepWeight(s.exerciseId)}
                      />
                      <PlateauKey
                        label={`Deload to ${s.plateau.deloadTo}`}
                        onPress={() => onAcceptDeload(s.exerciseId)}
                      />
                    </View>
                  </View>
                )}
              </View>
            ))}
          </View>
        )}

        {state.phase.name === 'done' && state.phase.endedEarly && (
          <Text style={styles.early}>Ended early — unfinished lifts count as failures</Text>
        )}
      </ScrollView>
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

function PlateauKey({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.plateauKey, pressed && styles.plateauKeyPressed]}
    >
      <Text style={styles.plateauKeyLabel}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { paddingHorizontal: 24, paddingTop: 48, paddingBottom: 24, gap: 16 },
  title: { ...type.h1, color: color.text.primary, marginBottom: 24 },
  statRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  statLabel: { ...type.h3, color: color.text.secondary },
  statValue: { ...type.h3Bold, color: color.text.primary },
  lifts: { marginTop: 24, gap: 12 },
  section: { ...type.label, color: color.text.secondary },
  liftRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  liftLeft: { flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 1 },
  skipMark: { ...type.title, color: color.text.muted, width: 20, textAlign: 'center' },
  liftName: { ...type.title, color: color.text.primary },
  liftChange: { ...type.titleValue, color: color.text.secondary },
  up: { color: color.success },
  liftHold: { ...type.titleValue, color: color.text.secondary },
  plateau: { width: '100%', gap: 8, paddingLeft: 28 },
  plateauText: { ...type.caption, color: color.warning },
  plateauButtons: { flexDirection: 'row', gap: 8 },
  plateauKey: {
    minHeight: 44,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: color.bg.raised,
  },
  plateauKeyPressed: { backgroundColor: color.press.raised },
  plateauKeyLabel: { ...type.label, color: color.text.onButton },
  offerSteady: { ...type.caption, color: color.text.muted, width: '100%', paddingLeft: 28 },
  early: { ...type.bodyLight, color: color.warning, marginTop: 16 },
  bottomBar: { paddingHorizontal: 24, paddingBottom: 40, paddingTop: 12 },
});
