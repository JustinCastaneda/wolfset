import { router } from 'expo-router';
import { useEffect, useState, useSyncExternalStore } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useHeartRate, type HeartRate } from '@/features/hr/useHeartRate';
import { color } from '@/theme/tokens';
import { ByFeelGridScreen } from './ByFeelGridScreen';
import { ConfirmEndSheet } from './ConfirmEndSheet';
import { EditWeightsScreen } from './EditWeightsScreen';
import { LogASetScreen } from './LogASetScreen';
import { PostSetTimerScreen } from './PostSetTimerScreen';
import { SessionDoneScreen } from './SessionDoneScreen';
import { WorkoutOverviewScreen } from './WorkoutOverviewScreen';
import { isSessionOver, session, type LiveSession } from './session-controller';
import { dayProgress, type Dispatch } from './session-ui';

// The session screen: one screen per phase of the live session (handoff brief §01), which
// lives outside React in session-controller.ts — the workout's brain, so a workout the
// watch drives keeps going with this screen closed, backgrounded or never opened. This
// screen starts or resumes it on mount, draws its state, and sends the same events the
// watch does. Leaving mid-workout leaves the session running (the hub shows Resume); the
// session closes on Finish, on either surface, and the screen leaves with it.

export function SessionScreen() {
  const live = useSyncExternalStore(session.subscribe, session.get);
  const [booted, setBooted] = useState(false);
  // Starting reads the plan and the snapshot — impure, so in an effect, never in render.
  useEffect(() => {
    const id = setTimeout(() => {
      session.start();
      // A session the watch started had no screen to hold the service or ask permissions.
      void session.onScreenOpened();
      setBooted(true);
    }, 0);
    return () => clearTimeout(id);
  }, []);
  // Nothing to run, or the session closed under this screen (Finish on the watch, a
  // replaced workout): back to where the screen was opened from.
  useEffect(() => {
    if (booted && live === null) router.back();
  }, [booted, live]);

  if (!live) return <View style={styles.root} />;
  return <SessionRunner live={live} />;
}

function SessionRunner({ live }: { live: LiveSession }) {
  const { state, day, startedAt, summary, avgBpm } = live;
  const dayName = day.name;
  const insets = useSafeAreaInsets();
  // The overview is navigation, not a machine phase (brief §01). Tree icon leads here.
  const [showOverview, setShowOverview] = useState(false);
  const [confirmingEnd, setConfirmingEnd] = useState(false);
  // The screen's clock: set on mount and on every tap, ticking while a rest counts down,
  // so screens never read time in render.
  const [now, setNow] = useState(0);
  useEffect(() => {
    const id = setTimeout(() => setNow(Date.now()), 0);
    return () => clearTimeout(id);
  }, []);
  const resting = state.phase.name === 'resting';
  useEffect(() => {
    if (!resting) return;
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, [resting]);
  const send: Dispatch = (event) => {
    if ('at' in event) setNow(event.at);
    session.dispatch(event);
  };

  // Live heart rate for the timer's number and ring; the gate's verdict is the session's.
  const hr = useHeartRate();
  const sessionOver = isSessionOver(state);
  const pendingRating = state.pendingRatings[0];
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
          now={now}
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
          avgBpm={avgBpm}
          dayName={dayName}
          hr={hr}
          now={now}
          onEvent={send}
          onFinish={() => session.finish()}
          onOverview={() => setShowOverview(true)}
          onPlateau={(id, deload) => session.answerPlateau(id, deload)}
          startedAt={startedAt}
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
  avgBpm,
  onEvent,
  onOverview,
  onPlateau,
  onFinish,
}: {
  state: LiveSession['state'];
  dayName: string;
  hr: HeartRate;
  now: number;
  startedAt: number;
  summary: LiveSession['summary'];
  avgBpm: number | null;
  onEvent: Dispatch;
  onOverview: () => void;
  onPlateau: (exerciseId: string, deload: boolean) => void;
  onFinish: () => void;
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
          avgBpm={avgBpm}
          now={now}
          onAcceptDeload={(id) => onPlateau(id, true)}
          onKeepWeight={(id) => onPlateau(id, false)}
          onLeave={onFinish}
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
