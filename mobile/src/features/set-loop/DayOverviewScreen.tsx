import { Image } from 'expo-image';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { Home } from 'lucide-react-native';
import { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/Button';
import { ConfirmSheet } from '@/components/ConfirmSheet';
import { CaptionLead, ExerciseRow, RowNumber } from '@/components/ExerciseRow';
import { TopBar } from '@/components/TopBar';
import { loadActivePlan, setNextDay } from '@/lib/db/plan-store';
import { loadAllProgress } from '@/lib/db/progress-store';
import { loadSnapshot } from '@/lib/db/session-store';
import { color, type } from '@/theme/tokens';
import { startAction, startLabel, type StartAction } from './day-overview';
import { session } from './session-controller';
import { applyProgress } from './plan-day';
import { estimatedMinutes, formatClock } from './session-ui';
import type { SessionExercise } from './types';

// The Day Overview — Workout Summary before it starts (Figma 34:778; Justin,
// 2026-09-04): a day's lifts as they would start, weights progressed, with one big
// Start Workout. Reached by tapping a day's name on the hub, for the user who wants to
// see the whole workout without starting it; the hub's arrow still starts straight
// away. The mid-workout overview (WorkoutOverviewScreen) is this same list with
// progress in the rows and the sets bar on top.
//
// The button is never a dead end (Justin, 2026-09-04): with another day's workout under
// way it stays red, and pressing it asks first — that workout ends where it stands, its
// unfinished lifts count as failures — then this day starts.

export function DayOverviewScreen() {
  const insets = useSafeAreaInsets();
  const { dayId } = useLocalSearchParams<{ dayId: string }>();
  const [view, setView] = useState<DayView | null>(null);
  const [confirmingReplace, setConfirmingReplace] = useState(false);
  useFocusEffect(
    useCallback(() => {
      const id = setTimeout(() => setView(loadDay(dayId ?? '')), 0);
      return () => clearTimeout(id);
    }, [dayId]),
  );

  const action: StartAction = view
    ? startAction({
        exerciseCount: view.exercises.length,
        isNext: view.isNext,
        inProgressName: view.inProgressName,
      })
    : { kind: 'none' };

  // Replace, so the session comes back to home, not here.
  const open = () => router.replace('/session');
  const press = () => {
    if (!view) return;
    switch (action.kind) {
      case 'none':
        return;
      case 'resume':
        // The arrow's rule (HomeHubScreen): a workout under way keeps its day.
        return open();
      case 'start':
        // This one becomes the rotation's next, and runs.
        setNextDay(view.dayId);
        return open();
      case 'replace':
        return setConfirmingReplace(true);
    }
  };
  const replace = () => {
    if (!view) return;
    setConfirmingReplace(false);
    session.abandon(Date.now());
    setNextDay(view.dayId);
    open();
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      {/* The muted mark behind the list (550:19082), as on Settings. */}
      <Image
        contentFit="contain"
        pointerEvents="none"
        source={require('../../../assets/brand/wolfset-watermark-logo.svg')}
        style={styles.watermark}
      />
      <TopBar
        align="left"
        onPressRight={() => router.back()}
        right={<Home color={color.text.primary} size={24} />}
        // The frame reads "Plan A • Week 3 of 5"; the week waits on the plan knowing
        // how long its mesocycle runs (build plan, open decision #14).
        title={view?.planName ?? ''}
      />
      {view && (
        <>
          <ScrollView contentContainerStyle={styles.scroll}>
            <View style={styles.titleBlock}>
              <Text style={styles.h1}>{view.name}</Text>
              <Text style={styles.subtitle}>
                {view.exercises.length} {view.exercises.length === 1 ? 'Workout' : 'Workouts'} •{' '}
                {view.volume.toLocaleString('en-US')} Lbs • ~{view.minutes}m
              </Text>
            </View>
            <View>
              {view.exercises.map((ex, i) => (
                <ExerciseRow
                  caption={
                    <>
                      <CaptionLead overrides={ex.overridesProgression === true} /> •{' '}
                      {formatClock(ex.restSeconds)} Rest
                    </>
                  }
                  indicator={<RowNumber n={i + 1} />}
                  key={ex.exerciseId}
                  rx={ex.prescribedSets === null ? 'open' : `${ex.prescribedSets}x${ex.targetReps}`}
                  title={ex.name}
                  weight={ex.weight}
                />
              ))}
            </View>
          </ScrollView>
          {/* Start Workout (34:788): the bottom bar's one solid button. */}
          <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 40 }]}>
            <Button disabled={action.kind === 'none'} onPress={press} title={startLabel(action)} />
          </View>
          {action.kind === 'replace' && (
            <ConfirmSheet
              confirmLabel="End & Start"
              message={`${action.inProgressName} is still in progress. Starting ${view.name} ends it now, and every lift you didn't finish counts as a failure.`}
              onCancel={() => setConfirmingReplace(false)}
              onConfirm={replace}
              title={`End ${action.inProgressName}?`}
              visible={confirmingReplace}
            />
          )}
        </>
      )}
    </View>
  );
}

type DayView = {
  dayId: string;
  name: string;
  planName: string;
  exercises: SessionExercise[];
  volume: number;
  minutes: number;
  isNext: boolean;
  /** The day a workout is under way on — always the rotation's next — or null. */
  inProgressName: string | null;
};

/** The day as the session would start it: the plan's prescription with the stored
 *  progress applied (plan-day.ts), so the weights here are the ones Log a Set shows. */
function loadDay(dayId: string): DayView | null {
  const plan = loadActivePlan();
  const day = plan?.days.find((d) => d.dayId === dayId);
  if (!plan || !day) return null;
  const exercises = applyProgress(day.exercises, loadAllProgress());
  const saved = loadSnapshot();
  const hasSession = saved !== null && saved.state.phase.name !== 'done';
  return {
    dayId: day.dayId,
    name: day.name,
    planName: plan.planName,
    exercises,
    volume: exercises.reduce(
      (sum, ex) => sum + (ex.prescribedSets ?? 0) * ex.targetReps * ex.weight,
      0,
    ),
    minutes: estimatedMinutes(exercises),
    isNext: day.isNext,
    inProgressName: hasSession ? (plan.days.find((d) => d.isNext)?.name ?? null) : null,
  };
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.bg.base },
  watermark: {
    position: 'absolute',
    width: 405,
    height: 405,
    alignSelf: 'center',
    top: '50%',
    marginTop: -405 / 2,
  },
  scroll: { paddingVertical: 24, gap: 32 },
  titleBlock: { paddingHorizontal: 24, paddingVertical: 4, gap: 8 },
  h1: { ...type.h1, color: color.text.primary },
  subtitle: { fontFamily: 'Geom', fontSize: 20, fontWeight: '400', color: color.text.secondary },
  bottomBar: { paddingHorizontal: 24, paddingTop: 12 },
});
