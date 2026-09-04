import { Check, Home } from 'lucide-react-native';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/Button';
import { CaptionLead, ExerciseRow, RowNumber } from '@/components/ExerciseRow';
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
            {state.exercises.length} {state.exercises.length === 1 ? 'Workout' : 'Workouts'} •{' '}
            {volume.toLocaleString('en-US')} Lbs
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
            // Any exercise with logged sets keeps its progress visible — jumping around
            // must never hide what's left (Justin, 2026-09-02, partial-progress mock).
            const started = logged > 0 && !doneEx;
            // Left indicator (permutations mock): check when done; dots for started
            // ≤4-set lifts; wheel for >4; plain number otherwise.
            const indicator = doneEx ? (
              <View style={styles.checkBadge}>
                <Check color={color.text.onButton} size={16} />
              </View>
            ) : started && ex.prescribedSets !== null && ex.prescribedSets <= 4 ? (
              <SetDots done={logged} total={ex.prescribedSets} />
            ) : started ? (
              <ProgressWheel progress={ex.prescribedSets ? logged / ex.prescribedSets : 0} />
            ) : (
              <RowNumber n={i + 1} />
            );
            // Captions: the current row carries Current Set (and the live countdown);
            // other started rows read "X of N Sets • Defaults • rest" per the mock.
            const lead = <CaptionLead overrides={ex.overridesProgression === true} />;
            const caption =
              started && current ? (
                <>
                  {logged} of {ex.prescribedSets} Sets •{' '}
                  {remaining !== null && remaining > 0 && `${formatClock(remaining)} • `}
                  <Text style={styles.upNext}>Current Set</Text>
                </>
              ) : started ? (
                <>
                  {logged} of {ex.prescribedSets} Sets • {lead} • {formatClock(ex.restSeconds)} Rest
                </>
              ) : (
                <>
                  {lead} •{' '}
                  {current ? (
                    <Text style={styles.upNext}>Up Next</Text>
                  ) : (
                    `${formatClock(ex.restSeconds)} Rest`
                  )}
                </>
              );
            return (
              <ExerciseRow
                caption={caption}
                current={current}
                indicator={indicator}
                key={ex.exerciseId}
                onPress={() => (current ? onReturn() : onJump(i))}
                rx={
                  ex.prescribedSets === null
                    ? `${logged} sets`
                    : `${ex.prescribedSets}x${ex.targetReps}`
                }
                title={ex.name}
                weight={ex.weight}
              />
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
  checkBadge: { backgroundColor: color.brand, borderRadius: 12, padding: 4 },
  upNext: { color: color.brand },
  bottomBar: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 24,
    paddingBottom: 40,
    paddingTop: 12,
  },
  grow: { flex: 1 },
});
