# Watch ↔ phone heart-rate protocol

The watch app (`wear/`) and the phone's native module (`mobile/modules/wolfset-hr`) agree on
this by hand — there is no shared library. Change it in both places and here.

## Routing prerequisites

The Wearable Data Layer only delivers between a watch app and a phone app that share **the
same `applicationId`** (`app.wolfset` on both) **and the same signing certificate**. Debug
builds: `mobile/plugins/withSharedDebugKeystore.js` points the phone app at
`~/.android/debug.keystore`, the keystore the watch build uses by default. Verify before a
hardware session — a mismatch drops every message silently on both sides:

```bash
apksigner verify --print-certs wear/app/build/outputs/apk/debug/app-debug.apk | grep SHA-1
apksigner verify --print-certs mobile/android/app/build/outputs/apk/debug/app-debug.apk | grep SHA-1
```

## Message

`MessageClient` message, path **`/wolfset/hr`**, one per sample, JSON body:

| Field | Type | Meaning |
|---|---|---|
| `seq` | int | Monotonic per watch stream. The phone drops anything ≤ the max already seen (out-of-order delivery was observed in the spike; a stale low BPM after a fresh high one would unlock the gate early). |
| `bpm` | number | Heart rate. |
| `acc` | string | Health Services accuracy: `ACCURACY_HIGH` / `_MEDIUM` / `_LOW` / `UNKNOWN`. |
| `watchWallMs` | int | Sample time on the watch's wall clock (ms). |
| `amb` | 0 / 1 | 1 when the watch was in ambient (blurred) mode. |
| `bm` | 0 / 1 | 1 when the `HEART_RATE_5_SECONDS` batching override is active — without it, delivery stalls in ambient until the wrist is raised. |

The phone stamps `phoneRecvMs` on arrival.

## Control message (phone → watch)

`MessageClient` message, path **`/wolfset/control`**, plain-text body `start` or `stop`.
The phone's session sends `start` when the workout screen mounts and `stop` when the
session finishes or the screen is left — the user never taps the watch (2026-09-03).

On the watch, `PhoneListenerService` handles it:

- `start` with the sensor permissions already granted → the foreground service starts
  and the watch screen opens on the session (2026-09-03); the watchface shows the
  ongoing-activity chip. Already streaming → the screen opens, nothing else.
- `start` without the permissions, or when the OS refuses a background service start →
  the watch screen opens, asks, then starts (MainActivity's auto-start extra).
- `stop` → the service stops. The service also stops itself after **3 hours** as a
  backstop for a `stop` that never arrives (phone app killed, session abandoned).

The phone's `startWatchStream()` / `stopWatchStream()` resolve with the number of connected
watches that took the message (0 = none connected) and reject only when the phone has no
Wearable support at all. The app treats both as "no signal" — the timer falls back to
time alone.

## Session item (phone → watch)

The watch mirrors the loop (Figma `123:3945`, 2026-09-03). The phone's session publishes
its view as a **Data Layer item** at path **`/wolfset/session`** — one string field, `view`,
holding JSON — whenever the machine's state changes. An item rather than a message because
it persists: a watch that opens late reads the latest (`MainActivity` on open), and the Data
Layer only delivers changes, so republishing the same view costs nothing. Built by
`features/set-loop/watch-view.ts` (tested, pure).

| Field | Type | Meaning |
|---|---|---|
| `screen` | `set` / `rest` / `done` / `none` | Which watch screen. `done` is Session Done; `none` clears the watch (screen left, poke grid up on the phone). |
| `exerciseNo` | int | 1-based position of the exercise — the "01" in "01 • Squat". |
| `exercise` | string | Exercise name. |
| `setsDone`, `setsTotal` | int | This exercise's sets — the pips across the top. |
| `setNo` | int | 1-based index of the set to log — the current pip. Past `setsDone` after a skip, which is also what changes the item so the watch learns the skip happened. |
| `dayDone`, `dayTotal` | int | The day's sets, for End Workout's "Only 3 of 5 sets done." |
| `canUnskip` | bool | This lift has a skipped set to go back to — the Actions panel shows Undo Skip. |
| `dayOrder` | int | The plan day this session runs (0-based order) — "Current" on Change It Up (`164:4192`). |
| `canChange` | bool | The workout is untouched (nothing logged, skipped or jumped) and the plan has another day — the Actions panel shows Change Workout instead of Undo Skip. |
| `days` | array | Every day of the plan, for Change It Up and the day preview (`123:3251`): `{ order, name, lifts: [{ name, weight, sets, reps }] }`, weights already progressed — what that day would start with. |
| `weight`, `unit`, `reps` | number, `Lbs`, int | The set to log; `reps` is the target the watch counts down from. |
| `restEndsAt` | int | Wall-clock ms (phone clock) when the rest ends; the watch counts down on its own clock. 0 outside a rest. |
| `restSeconds` | int | Length of the rest, for the ring's fraction. |
| `recovered` | bool | The gate's verdict for this rest: turns the watch's Continue solid. |
| `recoveredBelowBpm`, `approachingUpToBpm` | number | The thresholds, so the watch colours its ring from its own fresh reading (same rule as `features/hr/recovered.ts`). |

`done` carries the summary instead (Figma `164:4712`):

| Field | Type | Meaning |
|---|---|---|
| `durationSeconds` | int | Session length, from the phone's clock. |
| `volume` | number | Σ weight × reps — Total Weight. |
| `avgBpm` | number / null | The phone's average of every accepted sample this session; null when no watch streamed (the watch shows "––"). |
| `exercisesDone` | int | Lifts with at least one set logged. |

The watch is a display: it never decides anything about the workout. The one thing it
keeps for itself is whether its own "End Workout?" question is up, and it drops that as
soon as the phone publishes a different set.

## Action message (watch → phone)

`MessageClient` message, path **`/wolfset/action`**, JSON body `{ "type": ..., "reps": n, "day": n }`
(`reps` is 0 and `day` is -1 unless the action says otherwise):

- `logSet` with `reps` — the Log button on the watch's set screen;
- `continue` — the Continue button on the watch's timer;
- `skipSet` — Skip Set on the Actions panel (swipe left of the set or the timer): the
  machine moves to the next set without logging one; from the timer, the rest ends and
  the set that was coming is the one skipped;
- `unskipSet` — Undo Skip on the panel: back to this lift's first skipped set (sets are
  interchangeable, so the next set becomes the count logged); a running rest keeps
  running;
- `changeDay` with `day` — Start Workout on a day preview: the phone swaps that plan day's
  lifts in, from the top, and points the plan's rotation at it. Only while the workout is
  untouched (the machine's guard); nothing logged is ever lost;
- `endWorkout` — End on the watch's "End Workout?" screen. That screen *is* the double
  confirm, so the phone ends the session on it without asking again;
- `finish` — Finish on Session Done. Not a machine event: the phone leaves the session
  screen, exactly as its own Finish does, which clears the watch.

The phone's session turns each into the same machine event its own button sends
(`watchActionToEvent`), so a late or repeated tap is a no-op by the machine's guards: a
`logSet` during a rest and a `continue` while logging both change nothing. The watch waits
up to 4 s for the next view before re-enabling its buttons; the phone answers by publishing
the new session item, which is what moves the watch screen on.

## Expectations on the receiver (from `docs/spike-findings.md`)

1. **Staleness**: no fresh sample for ~6 s (3× the 1.92 s cadence) → the reading is
   *unknown*; show signal-lost; the gate must not change state on it.
2. **Out-of-order**: ignore `seq` ≤ the max seen.
3. **Bursts**: samples arrive in clumps (39 in 1.9 s after a stall); never assume one at a time.

## Timing to expect

Interactive watch ≈ 3.5 s beat-to-render; ambient ≈ 6–8 s (5 s batch floor + transport).

## Watch permissions (learned on hardware, 2026-09-02)

Wear OS 6 (Android 16) moved heart rate under Health Connect. Health Services refuses to
start an exercise without **`android.permission.health.READ_HEART_RATE`** — the error is a
`SecurityException: Missing permissions` in the watch log, and the watch screen says
"Could not start". The watch app declares and requests it alongside `BODY_SENSORS` and
`ACTIVITY_RECOGNITION`; older watches ignore the extra one. The Phase 0 spike predates this
OS update and would fail the same way on a current Pixel Watch 4.

## First hardware run (2026-09-02)

Pixel Watch 4 (Wear OS 6) → Pixel 10 Pro, both on the merged #41 + #42 builds, installed
over wireless ADB. The watch streamed with the 5-second override accepted; the phone's Post
Set Timer showed the live number within the first rest — 52 → 53 bpm over nine seconds, the
same number the watch displayed at that moment. Pictures: `docs/pr-shots/hr-hardware-run/`.
