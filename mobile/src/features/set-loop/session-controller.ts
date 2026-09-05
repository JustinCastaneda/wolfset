import { WolfsetHr, type HrSample, type WatchAction } from '@modules/wolfset-hr';

import {
  EMPTY_STREAM,
  currentBpm,
  ingest,
  meanBpm,
  type HrStreamState,
} from '@/features/hr/hr-stream';
import { isRecovered } from '@/features/hr/recovered';
import { onWatchAction, showOnWatch, startWatch, stopWatch } from '@/features/hr/watch-control';
import { advanceNextDay, loadActivePlan, setNextDay } from '@/lib/db/plan-store';
import { loadAllProgress, saveProgress } from '@/lib/db/progress-store';
import { loadSnapshot, saveSnapshot } from '@/lib/db/session-store';
import { abandonSavedSession, endSessionNow, storeFinishedSession } from './end-session';
import { idleEndsAt, idleVerdict, isLifterActivity, nextIdleCheckAt } from './idle';
import { isUntouched, reduce, startSession } from './machine';
import {
  armRestTimer,
  askStillLifting,
  disarmRestTimer,
  dismissStillLifting,
  ensureRestPermissions,
  holdWorkout,
  onNativeRestEnded,
  releaseWorkout,
  restEndedMatches,
  restEndsAt,
} from './native-rest';
import { applyProgress, type PlanDayStart } from './plan-day';
import { acceptDeload, type SettledExercise } from './settle-session';
import type { SessionEvent, SessionState } from './types';
import { watchActionToEvent, watchView } from './watch-view';

// The live workout, owned outside React (build plan Phase 7, the phone-less workout:
// "I open the watch, hit Next Workout and I'm in; I likely never open my phone"). The
// session screen used to be the workout's brain, which meant the workout only ran while
// that screen was up. Now this module is: one live session per app, started by the
// session screen, by Next Workout on the watch (from any screen, or with the app dead —
// the headless task in workout-task.ts), and resumed from its snapshot by whichever comes
// first. The screen only draws it and sends the same events the watch does.
//
// What it owns, in one place: the machine (reduce), the snapshot after every change,
// the watch's view and taps, the native rest timer and its "rest over", the recovered
// verdict from the heart-rate stream, the workout's foreground service (held from start
// to close), the settlement when the session is over, and the forgotten-workout clock
// (idle.ts): twenty idle minutes ask "Still lifting?", thirty end it. Leaving the screen
// changes nothing; only Finish — on either surface — or starting another day closes it.

/** The session as the screen sees it; a new object on every change, so React can tell. */
export type LiveSession = {
  state: SessionState;
  startedAt: number;
  /** The plan day running. Change Workout (the watch) replaces it before any set. */
  day: PlanDayStart;
  /** Every day the plan could run, weights progressed — the watch's Change It Up. */
  days: PlanDayStart[];
  /** The settled lifts once the session is over; null until then. */
  summary: SettledExercise[] | null;
  /** The stream's average this session; null before the first sample. */
  avgBpm: number | null;
  /** When the lifter last did something (idle.ts) — the forgotten-workout clock. */
  lastActivityAt: number;
  /** "Still lifting?" is being asked: when the workout ends unless they answer. */
  idlePromptEndsAt: number | null;
};

/** Every prescribed set answered and every poke grid too: the session is over. */
export function isSessionOver(state: SessionState): boolean {
  return state.phase.name === 'done' && state.pendingRatings.length === 0;
}

let live: LiveSession | null = null;
let stream: HrStreamState = EMPTY_STREAM;
let nativeRest = false;
/** The rest handed to the native timer, by its end; null outside a rest. */
let armedRest: number | null = null;
let jsRestTimer: ReturnType<typeof setTimeout> | null = null;
let idleTimer: ReturnType<typeof setTimeout> | null = null;
/** Set when the workout ended by itself: history ends at the last activity, not now. */
let autoEndedAt: number | null = null;
let lastPublished: string | null = null;
let unsubscribers: (() => void)[] = [];
const listeners = new Set<() => void>();
let closedWaiters: (() => void)[] = [];

function notify() {
  listeners.forEach((l) => l());
}

function publish() {
  if (!live) return;
  // The poke grid is phone-only, so while it is up the watch shows nothing.
  const json = JSON.stringify(
    live.state.pendingRatings.length === 0
      ? watchView(
          live.state,
          { startedAt: live.startedAt, now: Date.now(), avgBpm: live.avgBpm },
          { dayOrder: live.day.order, days: live.days },
          live.idlePromptEndsAt ?? 0,
        )
      : { screen: 'none' },
  );
  // Identical views cost nothing on the Data Layer, but not sending is cheaper still.
  if (json === lastPublished) return;
  lastPublished = json;
  showOnWatch(json);
}

/** Every rest is handed to the native timer with its end, and disarmed however the rest
 *  ends. A JS timer runs alongside for the screen-on case and for a refused permission;
 *  the machine takes the first "rest over" and ignores the second. */
function syncRest() {
  const endsAt = live ? restEndsAt(live.state.phase) : null;
  if (endsAt === armedRest) return;
  if (jsRestTimer !== null) clearTimeout(jsRestTimer);
  jsRestTimer = null;
  if (armedRest !== null) disarmRestTimer();
  armedRest = endsAt;
  if (endsAt === null) return;
  if (nativeRest) armRestTimer(endsAt);
  jsRestTimer = setTimeout(
    () => dispatch({ type: 'restEnded', reason: 'timer', at: Date.now() }),
    Math.max(0, endsAt - Date.now()),
  );
}

/** The session is over: score the lifts, move next session's weights, store them, turn
 *  the snapshot into history, rotate the plan. Once — a done session never changes. */
function settle(now: number) {
  if (!live || live.summary !== null) return;
  // The workout is over while the summary is read — the watch can rest now.
  void stopWatch();
  // A workout that ended by itself ended when the lifter last did something.
  const endedAt = autoEndedAt ?? now;
  const summary = storeFinishedSession(live.state, live.startedAt, endedAt, live.day.dayId);
  // Multi-day plans rotate: the next Start Workout runs the following day.
  advanceNextDay(live.day.dayId);
  live = { ...live, summary };
}

function afterChange() {
  if (!live) return;
  const now = Date.now();
  if (isSessionOver(live.state)) settle(now);
  else saveSnapshot(live.state, live.startedAt, now);
  syncRest();
  scheduleIdleCheck();
  publish();
  notify();
}

function dispatch(event: SessionEvent) {
  if (!live) return;
  const state = reduce(live.state, event);
  if (state === live.state) return;
  live = { ...live, state };
  if (isLifterActivity(event)) touch('at' in event ? event.at : Date.now());
  afterChange();
}

/** The lifter did something: the forgotten-workout clock restarts and any "Still
 *  lifting?" is withdrawn on both surfaces. */
function touch(at: number) {
  if (!live) return;
  const asked = live.idlePromptEndsAt !== null;
  live = { ...live, lastActivityAt: Math.max(live.lastActivityAt, at), idlePromptEndsAt: null };
  if (asked) dismissStillLifting();
}

/** The forgotten-workout clock (idle.ts). A JS timer aims at the next boundary, and
 *  every heart-rate sample re-checks too — with the phone asleep in a pocket the timer
 *  may drift, but the watch's samples keep arriving as long as it streams. */
function scheduleIdleCheck() {
  if (idleTimer !== null) clearTimeout(idleTimer);
  idleTimer = null;
  if (!live) return;
  const now = Date.now();
  const next = nextIdleCheckAt(live.lastActivityAt, live.startedAt, now);
  if (next === null) return;
  idleTimer = setTimeout(checkIdle, Math.max(0, next - now));
}

function checkIdle() {
  if (!live) return;
  const now = Date.now();
  switch (idleVerdict(live.lastActivityAt, live.startedAt, now)) {
    case 'active':
      return;
    case 'prompt': {
      // Session Done needs no asking: the workout is over, only Finish was forgotten —
      // the clock just runs on to the end.
      if (live.idlePromptEndsAt !== null || isSessionOver(live.state)) {
        scheduleIdleCheck();
        return;
      }
      const endsAt = idleEndsAt(live.lastActivityAt, live.startedAt);
      live = { ...live, idlePromptEndsAt: endsAt };
      askStillLifting(endsAt);
      afterChange();
      return;
    }
    case 'end':
      // On Session Done, the forgotten tap is Finish — the summary stands as settled.
      if (isSessionOver(live.state)) close();
      else autoEnd(live.lastActivityAt);
  }
}

/** Nobody answered: the workout ends as it stands, at the last thing the lifter did.
 *  Every logged set is credit; untouched lifts are failures, as when a workout is ended
 *  early by hand (decisions 2026-09-05). No Session Done to read — history has it. */
function autoEnd(at: number) {
  if (!live) return;
  autoEndedAt = at;
  live = { ...live, state: endSessionNow(live.state, at), idlePromptEndsAt: null };
  dismissStillLifting();
  afterChange();
  close();
}

function onSample(sample: HrSample) {
  if (!live) return;
  const now = Date.now();
  stream = ingest(stream, sample, now);
  live = { ...live, avgBpm: meanBpm(stream) };
  // The stream is a heartbeat for the forgotten-workout clock (scheduleIdleCheck).
  if (idleVerdict(live.lastActivityAt, live.startedAt, now) !== 'active') {
    checkIdle();
    if (!live) return;
  }
  // While resting, the recovered rule's verdict becomes the machine's flag — an input
  // that colors the ring and arms Continue, never a transition. A lost signal never flips
  // it back: stale data must not change the gate.
  if (live.state.phase.name !== 'resting') return;
  const bpm = currentBpm(stream, now);
  if (bpm === null) return;
  const recovered = isRecovered(bpm);
  if (recovered !== live.state.phase.recovered) dispatch({ type: 'recoveredChanged', recovered });
}

function onWatch(action: WatchAction) {
  if (!live) return;
  // Next Workout is the entry handler's (installWatchStart); here the session is live.
  if (action.type === 'startWorkout') return;
  if (action.type === 'finish') {
    if (isSessionOver(live.state)) close();
    return;
  }
  // Continue on the watch's "Still lifting?": back to the loop, clock restarted.
  if (action.type === 'stillLifting') {
    touch(Date.now());
    afterChange();
    return;
  }
  const event = watchActionToEvent(action, Date.now(), live.days);
  if (!event) return;
  if (event.type === 'dayChanged') {
    // The machine only takes it while the workout is untouched; the plan's rotation and
    // the running day move with it, so a finish, a kill and a resume, and the next Start
    // Workout all agree on which day ran.
    const picked = live.days.find((d) => d.order === action.day);
    if (!picked || !isUntouched(live.state)) return;
    setNextDay(picked.dayId);
    live = { ...live, day: picked };
  }
  dispatch(event);
}

function close() {
  if (!live) return;
  if (jsRestTimer !== null) clearTimeout(jsRestTimer);
  jsRestTimer = null;
  if (idleTimer !== null) clearTimeout(idleTimer);
  idleTimer = null;
  autoEndedAt = null;
  if (armedRest !== null) disarmRestTimer();
  armedRest = null;
  unsubscribers.forEach((off) => off());
  unsubscribers = [];
  void stopWatch();
  showOnWatch(JSON.stringify({ screen: 'none' }));
  lastPublished = null;
  releaseWorkout();
  live = null;
  stream = EMPTY_STREAM;
  notify();
  const waiters = closedWaiters;
  closedWaiters = [];
  waiters.forEach((resolve) => resolve());
}

export const session = {
  /** The live session, or null. Stable between changes (useSyncExternalStore). */
  get: (): LiveSession | null => live,

  subscribe(listener: () => void): () => void {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },

  /** Start the plan's up-next day, or resume the workout under way. True when a session
   *  is live afterwards; false with no plan day to run. Idempotent. */
  start(now = Date.now()): boolean {
    if (live) return true;
    // The day comes from the stored plan: the active plan's next day. A fresh session
    // starts from the stored progress: yesterday's hits moved today's weights
    // (data-model §5.2); the plan's start weight is only the first. Every day is prepared
    // the same way, so the watch's Change It Up shows what would start.
    const plan = loadActivePlan();
    const progress = loadAllProgress();
    const days = (plan?.days ?? [])
      .filter((d) => d.exercises.length > 0)
      .map((d) => ({ ...d, exercises: applyProgress(d.exercises, progress) }));
    const day = plan?.days.find((d) => d.isNext);
    if (!day || day.exercises.length === 0) return false;
    const saved = loadSnapshot();
    const resumed = saved && saved.state.phase.name !== 'done' ? saved : null;
    const state = resumed
      ? resumed.state
      : startSession('plan', applyProgress(day.exercises, progress));
    live = {
      state,
      startedAt: resumed ? resumed.startedAt : now,
      day: days.find((d) => d.dayId === day.dayId) ?? { ...day, exercises: state.exercises },
      days,
      summary: null,
      avgBpm: null,
      // A resumed workout's clock starts now: the lifter just came back to it.
      lastActivityAt: now,
      idlePromptEndsAt: null,
    };
    stream = EMPTY_STREAM;
    // The watch streams for the whole session (a resumed session starts it again —
    // harmless, the watch ignores a second start) and its taps are this session's events.
    void startWatch();
    unsubscribers = [onWatchAction(onWatch), onNativeRestEnded(onRestEnded), onHrSample(onSample)];
    holdWorkout(day.name);
    void ensureNativeRest();
    afterChange();
    return true;
  },

  /** The session screen opened on a live session. Opening it is the lifter showing up,
   *  so the forgotten-workout clock restarts; and only a screen can do two things a
   *  session the watch started had no screen for: hold the workout service from the
   *  foreground (Android may have refused it from the background — the "tap to open"
   *  notification leads here) and ask the rest timer's permissions. */
  async onScreenOpened(): Promise<void> {
    if (!live) return;
    if (!isSessionOver(live.state)) {
      touch(Date.now());
      afterChange();
    }
    holdWorkout(live.day.name);
    await ensureNativeRest();
  },

  dispatch,

  /** Finish on Session Done — either surface: the session closes and the watch clears. */
  finish() {
    if (live && isSessionOver(live.state)) close();
  },

  /** The workout under way is over as it stands (another day is starting): stored, and
   *  gone. Live or only in the snapshot — the Day Overview cannot tell, and need not. */
  abandon(now: number) {
    if (!live) {
      abandonSavedSession(now);
      return;
    }
    storeFinishedSession(endSessionNow(live.state, now), live.startedAt, now, live.day.dayId);
    close();
  },

  /** The plateau question's two answers (decisions 11b — the app asked). */
  answerPlateau(exerciseId: string, deload: boolean) {
    if (!live || live.summary === null) return;
    const now = Date.now();
    const summary = live.summary.map((lift) => {
      if (lift.exerciseId !== exerciseId || !lift.plateau) return lift;
      const progress = deload ? acceptDeload(lift) : { ...lift.progress };
      saveProgress(exerciseId, progress, now);
      return { ...lift, plateau: null, progress, nextWeight: progress.currentWeight };
    });
    live = { ...live, summary };
    notify();
  },

  /** Resolves when the live session closes; at once when none is live. The headless
   *  task awaits this so the workout service lives exactly as long as the session. */
  closed(): Promise<void> {
    if (!live) return Promise.resolve();
    return new Promise((resolve) => closedWaiters.push(resolve));
  },
};

/** The native rest timer needs permissions, asked once at the first workout; a refusal
 *  leaves the JS timer alone. Asked again from the screen, because a session the watch
 *  started headless had no screen to ask on. */
async function ensureNativeRest(): Promise<void> {
  if (nativeRest) return;
  nativeRest = await ensureRestPermissions();
  if (nativeRest && armedRest !== null) armRestTimer(armedRest);
}

function onRestEnded(event: { at: number; endsAt: number }) {
  if (restEndedMatches(event, armedRest)) {
    dispatch({ type: 'restEnded', reason: 'timer', at: event.at });
  }
}

/** Subscribe to the watch's samples; returns the unsubscribe. No module: no-op. */
function onHrSample(handler: (sample: HrSample) => void): () => void {
  const native = WolfsetHr;
  if (!native) return () => {};
  const sub = native.addListener('onHrSample', handler);
  return () => sub.remove();
}

/** Next Workout on the watch (docs/hr-protocol.md, `startWorkout`), from any screen or
 *  with none — the app's entry installs this once, so it does not depend on React
 *  rendering anything. The session screen navigates to it separately (use-watch-start). */
export function installWatchStart(): () => void {
  return onWatchAction((action) => {
    if (action.type === 'startWorkout') session.start();
  });
}
