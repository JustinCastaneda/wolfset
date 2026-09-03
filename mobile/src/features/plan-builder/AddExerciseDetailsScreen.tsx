import { router, useLocalSearchParams } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/Button';
import { ButtonGroup } from '@/components/ButtonGroup';
import { Chip } from '@/components/Chip';
import { ListItem } from '@/components/ListItem';
import { NumberSheet } from '@/components/NumberSheet';
import { TopBar } from '@/components/TopBar';
import { getExercise, type Exercise } from '@/lib/db/exercise-store';
import { lastWorkoutFor, type LastWorkout } from '@/lib/db/history-store';
import {
  addPlanExercise,
  loadDay,
  loadPlanExercise,
  updatePlanExercise,
  type BuilderDay,
  type StoredPlanExercise,
} from '@/lib/db/plan-store';
import { color, type } from '@/theme/tokens';
import {
  CEILING_OPTIONS,
  DEFAULT_REST_SECONDS,
  REP_OPTIONS,
  SET_OPTIONS,
  STRATEGY_LABEL,
  defaultPrescription,
  formatRest,
  isPerHand,
  suggestedWeight,
} from './exercise-defaults';

// Add Exercise Details (Figma 123:1092 Reps First; 380:8897 Steady; 380:10087 By Feel):
// the lift's chips, the weight stepper with last-workout context, the Button Groups
// (Reps First adds "Max Reps before Weight Increase"), and Add to Day. Reached again
// from a Day Summary row with `planExerciseId`: same screen, prefilled, Save Changes.
// Tapping the big weight number is Custom — the Number Sheet (Justin, 2026-09-02).
// ⚠️ Progression / Pacing overrides (114:3989, 384:11190) are later screens; their rows
// read the plan default and don't open anything yet, so they carry no chevron.

export function AddExerciseDetailsScreen() {
  const insets = useSafeAreaInsets();
  const { dayId, exerciseId, planExerciseId } = useLocalSearchParams<{
    dayId: string;
    exerciseId: string;
    planExerciseId?: string;
  }>();
  const [loaded, setLoaded] = useState<{
    day: BuilderDay;
    exercise: Exercise;
    last: LastWorkout | null;
    existing: StoredPlanExercise | null;
  } | null>(null);
  useEffect(() => {
    const id = setTimeout(() => {
      const day = dayId ? loadDay(dayId) : null;
      const exercise = exerciseId ? getExercise(exerciseId) : null;
      if (!day || !exercise) {
        router.back();
        return;
      }
      const existing = planExerciseId ? loadPlanExercise(planExerciseId) : null;
      setLoaded({ day, exercise, last: lastWorkoutFor(exercise.id), existing });
    }, 0);
    return () => clearTimeout(id);
  }, [dayId, exerciseId, planExerciseId]);

  if (!loaded) return <View style={[styles.root, { paddingTop: insets.top }]} />;
  return (
    <Details
      key={loaded.existing?.id ?? loaded.exercise.id}
      {...loaded}
      insetsBottom={insets.bottom}
      insetsTop={insets.top}
    />
  );
}

function Details({
  day,
  exercise,
  last,
  existing,
  insetsTop,
  insetsBottom,
}: {
  day: BuilderDay;
  exercise: Exercise;
  last: LastWorkout | null;
  existing: StoredPlanExercise | null;
  insetsTop: number;
  insetsBottom: number;
}) {
  const strategy = day.planStrategy;
  const defaults = defaultPrescription(strategy);
  const suggested = suggestedWeight(
    last ? { weight: last.weight, reps: last.reps, targetReps: defaults.reps } : null,
    exercise.loadType,
  );
  const [weight, setWeight] = useState(existing?.startWeight ?? suggested);
  const [sets, setSets] = useState(existing?.sets ?? defaults.sets);
  const [reps, setReps] = useState(existing?.reps ?? defaults.reps);
  const [ceiling, setCeiling] = useState(existing?.repCeiling ?? defaults.repCeiling);
  const [typingWeight, setTypingWeight] = useState(false);
  const repsFirst = strategy === 'reps-first';
  const editing = existing !== null;

  const onSave = () => {
    const input = {
      exerciseId: exercise.id,
      name: exercise.name,
      sets,
      reps,
      startWeight: weight,
      restSeconds: existing?.restSeconds ?? DEFAULT_REST_SECONDS,
      repCeiling: repsFirst ? ceiling : null,
    };
    if (existing) {
      updatePlanExercise(existing.id, input);
      router.back();
      return;
    }
    addPlanExercise(day.dayId, input);
    // Search → Details collapse: the stack becomes Plan Summary → Day Summary, so back
    // from the day is the plan, never the lift just added.
    router.dismissTo({ pathname: '/plan/[planId]', params: { planId: day.planId } });
    router.push({ pathname: '/plan/day/[dayId]', params: { dayId: day.dayId } });
  };

  return (
    <View style={[styles.root, { paddingTop: insetsTop, paddingBottom: insetsBottom }]}>
      <TopBar
        left={<ArrowLeft color={color.text.primary} size={24} />}
        onPressLeft={() => router.back()}
        title={`${day.dayName} • ${editing ? 'Edit Exercise' : 'Add Exercise'}`}
      />
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.header}>
          <View style={styles.titleBlock}>
            <Text style={styles.h1}>{exercise.name}</Text>
          </View>
          <View style={styles.chips}>
            <Chip label={LOAD_LABEL[exercise.loadType]} size="large" variant="outline" />
            {exercise.muscles.length > 0 && (
              <Chip label={exercise.muscles.join(' • ')} size="large" variant="outline" />
            )}
            {exercise.unilateral && <Chip label="Unilateral" size="large" variant="outline" />}
          </View>
        </View>

        <View style={styles.weightBlock}>
          <View style={styles.weight}>
            <Text style={styles.groupLabel}>
              {isPerHand(exercise.loadType) ? 'Weight • Per Hand' : 'Weight'}
            </Text>
            <View style={styles.stepper}>
              <StepKey label="-5" onPress={() => setWeight((w) => Math.max(0, w - 5))} />
              <Pressable
                accessibilityHint="Type a weight"
                accessibilityRole="button"
                onPress={() => setTypingWeight(true)}
              >
                <Text style={styles.weightValue}>{weight}</Text>
              </Pressable>
              <StepKey label="+5" onPress={() => setWeight((w) => w + 5)} />
            </View>
          </View>
          {/* Figma 123:1608 — only when the lift has history. */}
          {last && (
            <Text style={styles.estimate}>
              Last Workout{' '}
              <Text style={styles.estimateStrong}>
                {last.weight} x {last.reps}
              </Text>{' '}
              for {last.sets} sets • We suggest{' '}
              <Text style={styles.estimateStrong}>{suggested}</Text>
            </Text>
          )}
        </View>

        <View style={styles.group}>
          <ButtonGroup
            label="Sets"
            max={20}
            onChange={setSets}
            options={SET_OPTIONS}
            value={sets}
          />
        </View>
        <View style={styles.group}>
          <ButtonGroup
            label={repsFirst ? 'Starting Reps' : 'Reps'}
            max={50}
            onChange={setReps}
            options={REP_OPTIONS}
            value={reps}
          />
        </View>
        {repsFirst && (
          <View style={styles.group}>
            <ButtonGroup
              label="Max Reps before Weight Increase"
              max={50}
              onChange={setCeiling}
              options={CEILING_OPTIONS}
              value={ceiling}
            />
          </View>
        )}

        <View style={styles.rows}>
          <ListItem caption={`${STRATEGY_LABEL[strategy]} • Plan Default`} title="Progression" />
          <ListItem
            caption={`Rest ${formatRest(DEFAULT_REST_SECONDS)} • Plan Default`}
            title="Pacing"
          />
          {exercise.description !== '' && (
            <ListItem caption={exercise.description} title="View Exercise Details" />
          )}
        </View>
      </ScrollView>
      <View style={styles.bottomBar}>
        <Button onPress={onSave} title={editing ? 'Save Changes' : 'Add to Day'} />
      </View>
      <NumberSheet
        initial={weight}
        label={isPerHand(exercise.loadType) ? 'Weight • Per Hand' : 'Weight'}
        max={2000}
        min={0}
        mode="decimal"
        onCancel={() => setTypingWeight(false)}
        onSet={(w) => {
          setTypingWeight(false);
          setWeight(w);
        }}
        visible={typingWeight}
      />
    </View>
  );
}

// The ±5 keys (nodes 123:1138 / 123:1142) — the Secondary recipe at 64px, as on Edit Weights.
function StepKey({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.stepKey, pressed && styles.stepKeyPressed]}
    >
      <Text style={styles.stepLabel}>{label}</Text>
    </Pressable>
  );
}

const LOAD_LABEL: Record<Exercise['loadType'], string> = {
  barbell: 'Barbell',
  dumbbell: 'Dumbbell',
  machine: 'Machine',
  bodyweight: 'Bodyweight',
  kettlebell: 'Kettlebell',
  cable: 'Cable',
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.bg.base },
  // Figma 123:1101: pt24, gap 40 between blocks.
  scroll: { paddingTop: 24, paddingBottom: 24, gap: 40 },
  header: { gap: 24 },
  titleBlock: { paddingHorizontal: 24, paddingVertical: 4 },
  h1: { ...type.h1, color: color.text.primary },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 24 },
  weightBlock: { gap: 4 },
  weight: { paddingHorizontal: 24 },
  groupLabel: { ...type.button, color: color.text.secondary },
  stepper: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  weightValue: { ...type.displayL, color: color.text.primary },
  stepKey: {
    minWidth: 64,
    minHeight: 64,
    padding: 20,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: color.bg.raised,
  },
  stepKeyPressed: { backgroundColor: color.press.raised },
  stepLabel: { ...type.button, color: color.text.onButton },
  // Figma 123:1609: body at 1.4 leading, bold numbers in primary.
  estimate: { ...type.body, lineHeight: 22, color: color.text.secondary, paddingHorizontal: 24 },
  estimateStrong: { fontWeight: '700', color: color.text.primary },
  group: { paddingHorizontal: 24 },
  rows: {},
  bottomBar: { paddingHorizontal: 24, paddingBottom: 40, paddingTop: 12 },
});
