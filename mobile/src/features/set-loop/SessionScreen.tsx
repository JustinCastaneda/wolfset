import { router } from 'expo-router';
import { useEffect, useReducer, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { reduce, restRemaining, startSession } from './machine';
import type { SessionState } from './types';
import { DEMO_DAY, DEMO_DAY_NAME } from './demo-day';
import { EditWeightsScreen } from './EditWeightsScreen';
import { LogASetScreen } from './LogASetScreen';
import { PostSetTimerScreen } from './PostSetTimerScreen';
import { WorkoutOverviewScreen } from './WorkoutOverviewScreen';
import { ConfirmEndSheet } from './ConfirmEndSheet';
import { dayProgress } from './session-ui';
import { SessionDoneScreen } from './SessionDoneScreen';
import { color } from '@/theme/tokens';

// The session container: one useReducer over the tested machine, one screen per phase
// (handoff brief §01 — five screens, one state machine). The route file only mounts this.
//
// Rest is time-only for now: the ring runs on the clock and 0:00 auto-advances, exactly
// the "0:00 or Continue" flow. The HR gate plugs into `recoveredChanged` in Phase 7.

function initSession() {
  return startSession('plan', DEMO_DAY);
}

export function SessionScreen() {
  const [state, dispatch] = useReducer(reduce, undefined, initSession);
  // The overview is navigation, not a machine phase (brief §01: "Workout Summary is
  // the running list, reachable during the session"). The tree icon leads up here.
  const [showOverview, setShowOverview] = useState(false);
  const [confirmingEnd, setConfirmingEnd] = useState(false);
  // Clocks are set inside effects, never during render (React Compiler rule); the
  // machine itself only ever sees timestamps we hand it.
  const [clock, setClock] = useState({ startedAt: 0, now: 0 });
  useEffect(() => {
    // Seeded async so no state is set synchronously inside an effect (compiler rule).
    const id = setTimeout(() => {
      const t = Date.now();
      setClock((c) => (c.startedAt === 0 ? { startedAt: t, now: t } : c));
    }, 0);
    return () => clearTimeout(id);
  }, []);

  // Every timestamped event also moves the clock, so screens (like Session Done's
  // duration) never need to read time during render.
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

  const { done, total } = dayProgress(state);
  const sessionOver = state.phase.name === 'done';

  return (
    <View style={styles.root}>
      {showOverview && !sessionOver ? (
        <WorkoutOverviewScreen
          dayName={DEMO_DAY_NAME}
          onContinue={() => setShowOverview(false)}
          onEndRequest={() => setConfirmingEnd(true)}
          onLeave={() => router.back()}
          state={state}
        />
      ) : (
        <SessionBody
          now={clock.now}
          onEvent={send}
          onOverview={() => setShowOverview(true)}
          startedAt={clock.startedAt}
          state={state}
          onLeave={() => router.back()}
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
  onEvent,
  onOverview,
  onLeave,
}: {
  state: SessionState;
  now: number;
  startedAt: number;
  onEvent: React.Dispatch<Parameters<typeof reduce>[1]>;
  onOverview: () => void;
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
      return <SessionDoneScreen now={now} onLeave={onLeave} startedAt={startedAt} state={state} />;
  }
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.bg.base },
});
