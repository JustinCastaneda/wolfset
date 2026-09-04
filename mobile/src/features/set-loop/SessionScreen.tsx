import { router } from 'expo-router';
import { useCallback, useEffect, useReducer, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useHeartRate, type HeartRate } from '@/features/hr/useHeartRate';
import { onWatchAction, showOnWatch, startWatch, stopWatch } from '@/features/hr/watch-control';
import {
  armRestTimer,
  disarmRestTimer,
  ensureRestPermissions,
  onNativeRestEnded,
  restEndedMatches,
  restEndsAt,
} from './native-rest';
import { finalizeSession, loadSnapshot, saveSnapshot } from '@/lib/db/session-store';
import { advanceNextDay, loadActivePlan, setNextDay } from '@/lib/db/plan-store';
import { loadAllProgress, saveProgress } from '@/lib/db/progress-store';
import { applyProgress, type PlanDayStart } from './plan-day';
import { acceptDeload, settleSession, type SettledExercise } from './settle-session';
import { color } from '@/theme/tokens';
import { ConfirmEndSheet } from './ConfirmEndSheet';
import { EditWeightsScreen } from './EditWeightsScreen';
import { LogASetScreen } from './LogASetScreen';
import { PostSetTimerScreen } from './PostSetTimerScreen';
import { SessionDoneScreen } from './SessionDoneScreen';
import { WorkoutOverviewScreen } from './WorkoutOverviewScreen';
import { ByFeelGridScreen } from './ByFeelGridScreen';
import { dayProgress } from './session-ui';
import { isUntouched, reduce, restRemaining, startSession } from './machine';
import type { SessionState } from './types';
import { watchActionToEvent, watchView } from './watch-view';

// The session container: one useReducer over the tested machine, one screen per phase
// (handoff brief §01). The route file only mounts this.
//
// Local-first (decision #1): every event snapshots the whole machine state to SQLite,
// so a killed app resumes exactly where it stood — including a running rest, because
// its timestamps are absolute. Finishing turns the snapshot into history rows.
//
// The watch's heart rate feeds the machine through `recoveredChanged` — an input that
// colors the ring and arms Continue, never a transition (brief §01). The session also
// drives the watch: mounting starts its stream, finishing (or leaving) stops it, so the
// watch is never tapped to stream (decision 2026-09-03). The watch mirrors the loop: every
// state change publishes its view (watch-view.ts) and a Log, Continue, Skip Set or End
// tapped on the wrist arrives as the same event the phone's button sends; Finish on the
// watch's Session Done leaves like the phone's. Change Workout on the wrist swaps in
// another plan day while nothing has been logged, and the plan's rotation follows.
// Each rest is also handed to the native rest timer, which holds it through screen-off
// and buzzes at the end (native-rest.ts).

/** Every day the plan could run, weights progressed, and which one this session is. */
type Boot = { state: SessionState; startedAt: number; day: PlanDayStart; days: PlanDayStart[] };

export function SessionScreen() {
  // The snapshot and plan reads are impure, so they happen in an effect, never in render.
  const [boot, setBoot] = useState<Boot | null>(null);
  useEffect(() => {
    const id = setTimeout(() => {
      // The day comes from the stored plan (plan-store): the active plan's next day. A
      // fresh session starts from the stored progress: yesterday's hits moved today's
      // weights (data-model §5.2); the plan's start weight is only the first. Every day
      // is prepared the same way, so the watch's Change It Up shows what would start.
      // No plan, or an empty day, means nothing to run — back to home.
      const plan = loadActivePlan();
      const progress = loadAllProgress();
      const days = (plan?.days ?? [])
        .filter((d) => d.exercises.length > 0)
        .map((d) => ({ ...d, exercises: applyProgress(d.exercises, progress) }));
      const day = plan?.days.find((d) => d.isNext);
      if (!day || day.exercises.length === 0) {
        router.back();
        return;
      }
      const saved = loadSnapshot();
      const state =
        saved && saved.state.phase.name !== 'done'
          ? saved.state
          : startSession('plan', applyProgress(day.exercises, progress));
      setBoot({
        state,
        startedAt: saved && saved.state.phase.name !== 'done' ? saved.startedAt : 0,
        day: days.find((d) => d.dayId === day.dayId) ?? { ...day, exercises: state.exercises },
        days,
      });
    }, 0);
    return () => clearTimeout(id);
  }, []);

  if (!boot) return <View style={styles.root} />;
  return <SessionRunner boot={boot} />;
}

function SessionRunner({ boot }: { boot: Boot }) {
  // The day this session runs. Change Workout (the watch) replaces it before any set.
  const [day, setDay] = useState(boot.day);
  const dayName = day.name;
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
  const send = useCallback<typeof dispatch>((event) => {
    if ('at' in event) {
      setClock((c) => ({ startedAt: c.startedAt || event.at, now: event.at }));
    }
    dispatch(event);
  }, []);

  const resting = state.phase.name === 'resting';
  useEffect(() => {
    if (!resting) return;
    const id = setInterval(() => setClock((c) => ({ ...c, now: Date.now() })), 250);
    return () => clearInterval(id);
  }, [resting]);

  // Live heart rate for the whole session. While resting, the recovered rule's verdict
  // becomes the machine's `recovered` flag; a lost signal never flips it back — stale data
  // must not change the gate (spike pipe requirement 1).
  const hr = useHeartRate();
  // The watch streams exactly while this session is on screen: start on mount (a resumed
  // session starts it again — harmless, the watch ignores a second start), stop on unmount.
  useEffect(() => {
    void startWatch();
    return () => {
      void stopWatch();
    };
  }, []);
  // The watch's screen follows the loop. Published as a string so identical states cost
  // nothing; leaving the session clears it; a tap on the watch is dispatched like a tap
  // here. The poke grid is phone-only, so while it is up the watch shows nothing.
  const pendingRating = state.pendingRatings[0];
  const sessionOver = state.phase.name === 'done' && state.pendingRatings.length === 0;
  const viewJson = JSON.stringify(
    pendingRating === undefined
      ? watchView(
          state,
          { startedAt: clock.startedAt, now: clock.now, avgBpm: hr.mean },
          { dayOrder: day.order, days: boot.days },
        )
      : { screen: 'none' },
  );
  useEffect(() => {
    showOnWatch(viewJson);
  }, [viewJson]);
  useEffect(() => () => showOnWatch(JSON.stringify({ screen: 'none' })), []);
  useEffect(
    () =>
      onWatchAction((action) => {
        if (action.type === 'finish') {
          if (sessionOver) router.back();
          return;
        }
        const event = watchActionToEvent(action, Date.now(), boot.days);
        if (!event) return;
        if (event.type === 'dayChanged') {
          // The machine only takes it while the workout is untouched; the plan's
          // rotation and this screen's day move with it, so a finish, a kill and a
          // resume, and the next Start Workout all agree on which day ran.
          const picked = boot.days.find((d) => d.order === action.day);
          if (!picked || !isUntouched(state)) return;
          setNextDay(picked.dayId);
          setDay(picked);
        }
        send(event);
      }),
    [send, sessionOver, boot.days, state],
  );

  // The doze-proof rest timer. Permission is asked once, at the first workout; a refusal
  // leaves the on-screen timer alone. Every rest arms the native timer with its end and
  // disarms it however the rest ends. Its "rest over" is the same event the on-screen
  // clock sends — the machine advances, native never does.
  const [nativeRest, setNativeRest] = useState(false);
  useEffect(() => {
    let alive = true;
    void ensureRestPermissions().then((ok) => {
      if (alive) setNativeRest(ok);
    });
    return () => {
      alive = false;
    };
  }, []);
  const endsAt = restEndsAt(state.phase);
  useEffect(() => {
    if (!nativeRest || endsAt === null) return;
    armRestTimer(endsAt);
    return () => disarmRestTimer();
  }, [nativeRest, endsAt]);
  useEffect(
    () =>
      onNativeRestEnded((event) => {
        if (restEndedMatches(event, endsAt)) {
          send({ type: 'restEnded', reason: 'timer', at: event.at });
        }
      }),
    // endsAt names the current rest; a new rest resubscribes with its own.
    [endsAt, send],
  );
  const recoveredNow = state.phase.name === 'resting' ? state.phase.recovered : null;
  useEffect(() => {
    if (!resting || hr.recovered === null || hr.recovered === recoveredNow) return;
    dispatch({ type: 'recoveredChanged', recovered: hr.recovered });
  }, [resting, hr.recovered, recoveredNow]);

  const remaining = clock.now === 0 ? null : restRemaining(state, clock.now);
  useEffect(() => {
    if (resting && remaining === 0) {
      dispatch({ type: 'restEnded', reason: 'timer', at: Date.now() });
    }
  }, [resting, remaining]);

  // Persistence: snapshot after every state change; on done — once the poke grid has
  // been answered or skipped — settle: score the lifts, move next session's weights,
  // store them, and turn the snapshot into history.
  useEffect(() => {
    if (clock.startedAt === 0) return;
    if (!sessionOver) {
      saveSnapshot(state, clock.startedAt, Date.now());
      return;
    }
    // The workout is over while the summary is read — the watch can rest now.
    void stopWatch();
    // Deferred so no state is set synchronously inside an effect (compiler rule).
    // settleSession is deterministic and a done session never changes, so this runs once.
    const id = setTimeout(() => {
      const now = Date.now();
      const settled = settleSession(state, loadAllProgress());
      for (const lift of settled) saveProgress(lift.exerciseId, lift.progress, now);
      finalizeSession(state, clock.startedAt, now, day.dayId);
      // Multi-day plans rotate: the next Start Workout runs the following day.
      advanceNextDay(day.dayId);
      setSummary(settled);
    }, 0);
    return () => clearTimeout(id);
  }, [state, sessionOver, clock.startedAt, day.dayId]);

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

  return (
    <View style={[styles.root, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      {pendingRating !== undefined ? (
        <ByFeelGridScreen
          dayName={dayName}
          exerciseIndex={pendingRating}
          key={pendingRating}
          onEvent={send}
          state={state}
        />
      ) : showOverview && !sessionOver ? (
        <WorkoutOverviewScreen
          dayName={dayName}
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
          dayName={dayName}
          hr={hr}
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
  dayName,
  hr,
  now,
  startedAt,
  summary,
  onEvent,
  onOverview,
  onPlateau,
  onLeave,
}: {
  state: SessionState;
  dayName: string;
  hr: HeartRate;
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
          dayName={dayName}
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
          dayName={dayName}
          hr={hr}
          now={now}
          onEvent={onEvent}
          onOverview={onOverview}
          state={state}
        />
      );
    case 'editing-weight':
      return <EditWeightsScreen dayName={dayName} onEvent={onEvent} state={state} />;
    case 'done':
      return (
        <SessionDoneScreen
          avgBpm={hr.mean}
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
