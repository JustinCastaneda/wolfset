import { Check, Home } from 'lucide-react-native';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/Button';
import { ProgressWheel } from '@/components/ProgressWheel';
import { SetDots } from '@/components/SetDots';
import { TopBar } from '@/components/TopBar';
import { color, type } from '@/theme/tokens';
import { restRemaining } from './machine';
import { dayProgress, formatClock, plannedVolume } from './session-ui';
import type { SessionState } from './types';

// The mid-workout overview — Workout Summary / Progress (Figma 384:11481). One level
// up from the set: this is the *workout* context, so "End Workout" lives here and only
// here (Justin, 2026-09-02: CTAs act on the context they live in — never kill the
// parent from a child screen). The set screens' tree icon leads up to this.

export function WorkoutOverviewScreen({
  state,
  dayName,
  now,
  onContinue,
  onReturn,
  onJump,
  onEndRequest,
  onLeave,
}: {
  state: SessionState;
  dayName: string;
  now: number;
  onContinue: () => void;
  /** Current row tap: plain return to wherever the session is — logging or mid-timer. */
  onReturn: () => void;
  /** Any other row tap: jump to that exercise, even midway through sets. */
  onJump: (index: number) => void;
  onEndRequest: () => void;
  onLeave: () => void;
}) {
  const { done, total } = dayProgress(state);
  const volume = plannedVolume(state);
  const allDone = state.phase.name === 'all-sets-done';
  const remaining = now === 0 ? null : restRemaining(state, now);

  return (
    <View style={styles.root}>
      <TopBar
        align="left"
        onPressRight={onLeave}
        right={<Home color={color.text.primary} size={24} />}
        title={dayName}
      />
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.titleBlock}>
          <Text style={styles.h1}>{dayName}</Text>
          <Text style={styles.subtitle}>
            {state.exercises.length} Workouts • {volume.toLocaleString('en-US')} Lbs
          </Text>
        </View>

        {/* The proportional fill bar + caption (node 433:22451). */}
        <View style={styles.progressBlock}>
          <View style={styles.barTrack}>
            <View style={[styles.barFill, { flex: done }]} />
            <View style={[styles.barRest, { flex: Math.max(total - done, 0.0001) }]} />
          </View>
          <Text style={styles.barCaption}>
            {done} of {total} sets logged
          </Text>
        </View>

        <View>
          {state.exercises.map((ex, i) => {
            const logged = state.sets.filter((s) => s.exerciseIndex === i).length;
            const doneEx = ex.prescribedSets !== null && logged >= ex.prescribedSets;
            const current = i === state.exerciseIndex && !allDone;
            const inProgress = current && logged > 0;
            // Left indicator (permutations mock, 2026-09-02): check when done; dots for
            // in-progress ≤4 sets; wheel for >4; plain number otherwise.
            const indicator = doneEx ? (
              <View style={styles.checkBadge}>
                <Check color={color.text.onButton} size={16} />
              </View>
            ) : inProgress && ex.prescribedSets !== null && ex.prescribedSets <= 4 ? (
              <SetDots done={logged} total={ex.prescribedSets} />
            ) : inProgress ? (
              <ProgressWheel progress={ex.prescribedSets ? logged / ex.prescribedSets : 0} />
            ) : (
              <Text style={styles.rowNumber}>{i + 1}</Text>
            );
            // Subtext shows live status: sets logged, the rest countdown mid-timer,
            // and Current Set / Up Next in brand.
            const caption = inProgress ? (
              <Text style={styles.rowCaption}>
                {logged} of {ex.prescribedSets} Sets •{' '}
                {remaining !== null && remaining > 0 && `${formatClock(remaining)} • `}
                <Text style={styles.upNext}>Current Set</Text>
              </Text>
            ) : (
              <Text style={styles.rowCaption}>
                Defaults •{' '}
                {current ? (
                  <Text style={styles.upNext}>Up Next</Text>
                ) : (
                  `${formatClock(ex.restSeconds)} Rest`
                )}
              </Text>
            );
            return (
              <Pressable
                accessibilityRole="button"
                key={ex.exerciseId}
                onPress={() => (current ? onReturn() : onJump(i))}
                style={({ pressed }) => [
                  styles.row,
                  current && styles.rowCurrent,
                  pressed && styles.rowPressed,
                ]}
              >
                <View style={styles.rowLeft}>
                  <View style={styles.indicatorBox}>{indicator}</View>
                  <View style={styles.rowText}>
                    <Text style={styles.rowTitle}>{ex.name}</Text>
                    {caption}
                  </View>
                </View>
                <View style={styles.rowRight}>
                  <Text style={styles.rowWeight}>{ex.weight}</Text>
                  <Text style={styles.rowRx}>
                    {ex.prescribedSets === null
                      ? `${logged} sets`
                      : `${ex.prescribedSets}x${ex.targetReps}`}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>

      {/* End Workout • Continue — node 384:11482. */}
      <View style={styles.bottomBar}>
        <View style={styles.grow}>
          <Button
            onPress={onEndRequest}
            title={allDone ? 'Finish Workout' : 'End Workout'}
            variant="secondary"
          />
        </View>
        <View style={styles.grow}>
          <Button onPress={onContinue} title="Continue" />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { paddingVertical: 24, gap: 32 },
  titleBlock: { paddingHorizontal: 24, gap: 8 },
  h1: { ...type.h1, color: color.text.primary },
  subtitle: { fontFamily: 'Geom', fontSize: 20, fontWeight: '400', color: color.text.secondary },
  progressBlock: { paddingHorizontal: 24, gap: 8 },
  barTrack: { flexDirection: 'row', gap: 8, height: 8 },
  barFill: { backgroundColor: color.brand, borderRadius: 4 },
  barRest: { backgroundColor: color.setsBar.upcoming, borderRadius: 4 },
  barCaption: { ...type.caption, color: color.text.secondary },
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
  rowLeft: { flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 1 },
  checkBadge: { backgroundColor: color.brand, borderRadius: 12, padding: 4 },
  rowNumber: { ...type.title, color: color.text.secondary, width: 24, textAlign: 'center' },
  rowText: { gap: 4, flexShrink: 1 },
  rowTitle: { ...type.title, color: color.text.primary },
  rowCaption: { ...type.caption, color: color.text.secondary },
  upNext: { color: color.brand },
  rowRight: { flexDirection: 'row', alignItems: 'baseline', gap: 4 },
  rowWeight: { ...type.titleValue, color: color.text.primary },
  rowRx: { ...type.label, color: color.text.secondary },
  bottomBar: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 24,
    paddingBottom: 40,
    paddingTop: 12,
  },
  grow: { flex: 1 },
});
