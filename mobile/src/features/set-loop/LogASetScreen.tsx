import { ListTree, Pencil } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/Button';
import { SegmentedProgress } from '@/components/SegmentedProgress';
import { TopBar } from '@/components/TopBar';
import { color, type } from '@/theme/tokens';
import { currentExercise, exerciseProgress, loopTitle, type Dispatch } from './session-ui';
import type { SessionState } from './types';

// Log a Set (Figma 384:11460): Display XL weight, "Lbs x N reps", sets bar, and a
// bottom bar of [reps square] [Log Reps]. "Tap the number to decrease reps" — the
// square counts down and wraps back to the target. Pencil in the Top Bar opens the
// Edit Weights detour.

export function LogASetScreen({
  state,
  dayName,
  onEvent,
  onOverview,
}: {
  state: SessionState;
  dayName: string;
  onEvent: Dispatch;
  onOverview: () => void;
}) {
  const exercise = currentExercise(state);
  // The parent remounts this screen per set (key), so the initial value is the reset.
  const [reps, setReps] = useState(exercise.targetReps);

  const allDone = state.phase.name === 'all-sets-done';
  const { done, total } = exerciseProgress(state);

  return (
    <View style={styles.root}>
      <TopBar
        left={<ListTree color={color.text.primary} size={24} />}
        onPressLeft={onOverview}
        onPressRight={() => onEvent({ type: 'weightEditOpened' })}
        right={<Pencil color={color.text.primary} size={24} />}
        title={loopTitle(dayName, state)}
      />
      <View style={styles.sets}>
        <SegmentedProgress done={done} showCurrent={!allDone} total={total} />
      </View>

      <View style={styles.center}>
        <Text style={styles.weight}>{exercise.weight}</Text>
        {/* Reduced reps read "3/5 reps" in brand — the original target stays visible
            (Log a Set / Failed Reps mock, 2026-09-02). */}
        <Text style={styles.context}>
          Lbs x{' '}
          {reps < exercise.targetReps ? (
            <Text style={styles.contextShort}>
              {reps}/{exercise.targetReps} reps
            </Text>
          ) : (
            `${reps} ${reps === 1 ? 'rep' : 'reps'}`
          )}
        </Text>
      </View>

      <Text style={styles.hint}>
        {allDone
          ? 'All sets done — bonus set here, or finish from the workout view'
          : 'Tap the number to decrease reps'}
      </Text>
      <View style={styles.bottomBar}>
        <Pressable
          accessibilityLabel={`${reps} reps, tap to decrease`}
          accessibilityRole="button"
          onPress={() => setReps((r) => (r > 1 ? r - 1 : exercise.targetReps))}
          style={({ pressed }) => [styles.repsKey, pressed && styles.repsKeyPressed]}
        >
          <Text style={styles.repsLabel}>{reps}</Text>
        </Pressable>
        <View style={styles.grow}>
          <Button
            onPress={() => onEvent({ type: 'setLogged', reps, at: Date.now() })}
            title="Log Reps"
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  sets: { paddingHorizontal: 24, paddingVertical: 12 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 },
  weight: { ...type.displayXl, color: color.text.primary },
  context: { ...type.h3, color: color.text.secondary },
  contextShort: { color: color.brand },
  hint: { ...type.bodyLight, color: color.text.secondary, textAlign: 'center', marginBottom: 12 },
  bottomBar: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 24,
    paddingBottom: 40,
    paddingTop: 12,
  },
  // The reps square is the Secondary button recipe at fixed width (node 384:11468).
  repsKey: {
    width: 64,
    minHeight: 64,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: color.bg.raised,
  },
  repsKeyPressed: { backgroundColor: color.press.raised },
  repsLabel: { ...type.button, color: color.text.onButton },
  grow: { flex: 1 },
});
