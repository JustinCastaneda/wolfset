import { router } from 'expo-router';
import { useEffect, useReducer, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { finalizeSession, loadSnapshot, saveSnapshot } from '@/lib/db/session-store';
import { loadAllProgress, saveProgress } from '@/lib/db/progress-store';
import { acceptDeload, settleSession, type SettledExercise } from './settle-session';
import { color } from '@/theme/tokens';
import { ConfirmEndSheet } from './ConfirmEndSheet';
import { DEMO_DAY, DEMO_DAY_NAME } from './demo-day';
import { EditWeightsScreen } from './EditWeightsScreen';
import { LogASetScreen } from './LogASetScreen';
import { PostSetTimerScreen } from './PostSetTimerScreen';
import { SessionDoneScreen } from './SessionDoneScreen';
import { WorkoutOverviewScreen } from './WorkoutOverviewScreen';
import { ByFeelGridScreen } from './ByFeelGridScreen';
import { dayProgress } from './session-ui';
import { reduce, restRemaining, startSession } from './machine';
import type { SessionState } from './types';

// The session container: one useReducer over the tested machine, one screen per phase
// (handoff brief §01). The route file only mounts this.
//
// Local-first (decision #1): every event snapshots the whole machine state to SQLite,
// so a killed app resumes exactly where it stood — including a running rest, because
// its timestamps are absolute. Finishing turns the snapshot into history rows.
//
// Rest is time-only for now; the HR gate plugs into `recoveredChanged` in Phase 7.

type Boot = { state: SessionState; startedAt: number };

export function SessionScreen() {
  // The snapshot read is impure, so it happens in an effect, never during render.
  const [boot, setBoot] = useState<Boot | null>(null);
  useEffect(() => {
    const id = setTimeout(() => {
      const saved = loadSnapshot();
      if (saved && saved.state.phase.name !== 'done') {
        setBoot(saved);
        return;
      }
      // A fresh session starts from the stored progress: yesterday's hits moved
      // today's weights (data-model §5.2).
      const progress = loadAllProgress();
      const day = DEMO_DAY.map((ex) => ({
        ...ex,
        weight: progress[ex.exerciseId]?.currentWeight ?? ex.weight,
        targetReps:
          ex.strategy === 'by-feel'
            ? (progress[ex.exerciseId]?.currentReps ?? ex.targetReps)
            : ex.targetReps,
      }));
      setBoot({ state: startSession('plan', day), startedAt: 0 });
    }, 0);
    return () => clearTimeout(id);
  }, []);

  if (!boot) return <View style={styles.root} />;
  return <SessionRunner boot={boot} />;
}

function SessionRunner({ boot }: { boot: Boot }) {
  const insets = useSafeAreaInsets();
  const [state, dispatch] = useReducer(reduce, boot.state);
  // The overview is navigation, not a machine phase (brief §01). Tree icon leads here.
  const [showOverview, setShowOverview] = useState(false);
  const [confirmingEnd, setConfirmingEnd] = useState(false);
  const [summary, setSummary] = useState<SettledExercise[] | null>(null);
  const [clock, setClock] = useState({ startedAt: boot.startedAt, now: 0 });

  useEffect(() => {
    const id = setTimeout(() => {
      const t = Date.now();
      setClock((c) => ({ startedAt: c.startedAt || t, now: t }));
    }, 0);
    return () => clearTimeout(id);
  }, []);

  // Every timestamped event also moves the clock, so screens never read time in render.
  const send: typeof dispatch = (event) => {
    if ('at' in event) {
      setClock((c) => ({ startedAt: c.startedAt || event.at, now: event.at }));
    }
    dispatch(event);
  };

  const resting = state.phase.name === 'resting';
  useEffect(() => {
    if (!resting) return;
    const id = setInterval(() => setClock((c) => ({ ...c, now: Date.now() })), 250);
    return () => clearInterval(id);
  }, [resting]);

  const remaining = clock.now === 0 ? null : restRemaining(state, clock.now);
  useEffect(() => {
    if (resting && remaining === 0) {
      dispatch({ type: 'restEnded', reason: 'timer', at: Date.now() });
    }
  }, [resting, remaining]);

  // Persistence: snapshot after every state change; on done — once the poke grid has
  // been answered or skipped — settle: score the lifts, move next session's weights,
  // store them, and turn the snapshot into history.
  const sessionOver = state.phase.name === 'done' && state.pendingRatings.length === 0;
  useEffect(() => {
    if (clock.startedAt === 0) return;
    if (!sessionOver) {
      saveSnapshot(state, clock.startedAt, Date.now());
      return;
    }
    // Deferred so no state is set synchronously inside an effect (compiler rule).
    // settleSession is deterministic and a done session never changes, so this runs once.
    const id = setTimeout(() => {
      const now = Date.now();
      const settled = settleSession(state, loadAllProgress());
      for (const lift of settled) saveProgress(lift.exerciseId, lift.progress, now);
      finalizeSession(state, clock.startedAt, now);
      setSummary(settled);
    }, 0);
    return () => clearTimeout(id);
  }, [state, sessionOver, clock.startedAt]);

  // The plateau question's two answers (decisions 11b — the app asked).
  const answerPlateau = (exerciseId: string, deload: boolean) => {
    setSummary((prev) => {
      if (!prev) return prev;
      const next = prev.map((lift) => {
        if (lift.exerciseId !== exerciseId || !lift.plateau) return lift;
        const progress = deload ? acceptDeload(lift) : { ...lift.progress };
        saveProgress(exerciseId, progress, Date.now());
        return {
          ...lift,
          plateau: null,
          progress,
          nextWeight: progress.currentWeight,
        };
      });
      return next;
    });
  };

  const { done, total } = dayProgress(state);
  const pendingRating = state.pendingRatings[0];

  return (
    <View style={[styles.root, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      {pendingRating !== undefined ? (
        <ByFeelGridScreen
          dayName={DEMO_DAY_NAME}
          exerciseIndex={pendingRating}
          key={pendingRating}
          onEvent={send}
          state={state}
        />
      ) : showOverview && !sessionOver ? (
        <WorkoutOverviewScreen
          dayName={DEMO_DAY_NAME}
          now={clock.now}
          onContinue={() => {
            if (resting) send({ type: 'restEnded', reason: 'continue', at: Date.now() });
            setShowOverview(false);
          }}
          onEndRequest={() => setConfirmingEnd(true)}
          onJump={(index) => {
            send({ type: 'exerciseJumped', index, at: Date.now() });
            setShowOverview(false);
          }}
          onLeave={() => router.back()}
          onReturn={() => setShowOverview(false)}
          state={state}
        />
      ) : (
        <SessionBody
          now={clock.now}
          onEvent={send}
          onLeave={() => router.back()}
          onOverview={() => setShowOverview(true)}
          onPlateau={answerPlateau}
          startedAt={clock.startedAt}
          state={state}
          summary={summary}
        />
      )}
      <ConfirmEndSheet
        onCancel={() => setConfirmingEnd(false)}
        onEnd={() => {
          setConfirmingEnd(false);
          setShowOverview(false);
          send({ type: 'workoutEnded', at: Date.now() });
        }}
        setsDone={done}
        setsTotal={total}
        visible={confirmingEnd}
      />
    </View>
  );
}

function SessionBody({
  state,
  now,
  startedAt,
  summary,
  onEvent,
  onOverview,
  onPlateau,
  onLeave,
}: {
  state: SessionState;
  now: number;
  startedAt: number;
  summary: SettledExercise[] | null;
  onEvent: React.Dispatch<Parameters<typeof reduce>[1]>;
  onOverview: () => void;
  onPlateau: (exerciseId: string, deload: boolean) => void;
  onLeave: () => void;
}) {
  switch (state.phase.name) {
    case 'logging':
    case 'all-sets-done':
      return (
        <LogASetScreen
          dayName={DEMO_DAY_NAME}
          // Remounting per set resets the rep counter to the target without an effect.
          key={`${state.exerciseIndex}:${state.setIndex}`}
          onEvent={onEvent}
          onOverview={onOverview}
          state={state}
        />
      );
    case 'resting':
      return (
        <PostSetTimerScreen
          dayName={DEMO_DAY_NAME}
          now={now}
          onEvent={onEvent}
          onOverview={onOverview}
          state={state}
        />
      );
    case 'editing-weight':
      return <EditWeightsScreen dayName={DEMO_DAY_NAME} onEvent={onEvent} state={state} />;
    case 'done':
      return (
        <SessionDoneScreen
          now={now}
          onAcceptDeload={(id) => onPlateau(id, true)}
          onKeepWeight={(id) => onPlateau(id, false)}
          onLeave={onLeave}
          startedAt={startedAt}
          state={state}
          summary={summary}
        />
      );
  }
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.bg.base },
});
