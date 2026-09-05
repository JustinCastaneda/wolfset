# The rest timer — on screen and in the pocket

Two timers, one truth.

**The machine (JS) is the truth.** A rest is `startedAt + restSeconds`, absolute wall-clock
timestamps in the session state (`features/set-loop/machine.ts`). Whenever the screen is on,
the Post Set Timer counts down from those and ends the rest itself. A killed app resumes a
running rest from its snapshot. Nothing native is needed for correctness.

**The native service holds the rest when the screen is off.** Android throttles JS timers
once the screen is off and the phone is in a pocket — exactly when a rest runs. So every
rest is also handed to `WorkoutService` in the native module (`mobile/modules/wolfset-hr`),
the workout's one health-type foreground service — held from the session's start to its
close so the workout keeps running off screen (docs/hr-protocol.md, `startWorkout`; it was
`RestTimerService`, per rest, until 2026-09-05) — which for each rest:

- holds a partial wake lock for the length of the rest (plus a 10 s margin);
- turns the "Workout in progress" notification into a live countdown (drawn by the system,
  no ticking) and back when the rest ends;
- at the end, buzzes, **dings** and posts **"Rest over"**, and sends `onRestEnded { at, endsAt }`
  to JS — the machine ends the rest there, with the native time, so the recorded rest is exact.

That is the only alert. Recovering early is *shown* — green ring, Continue solid, on the
phone and the watch — never announced: the first hardware run dinged the instant a set was
logged because the heart rate was already under the threshold, which was noise. **We only
ding when the full timer is done; the user makes the call on whether they're recovered**
(Justin, 2026-09-03). A "Recovered" buzz + ding + notification existed in #46–#48 and was
removed.

**The ding** is a bundled bell (`modules/wolfset-hr/android/src/main/res/raw/rest_ding.wav`,
a synthesized C6 with a short decay) played by the service on the **alarm stream**, not by
the notification: it sounds through headphones with the phone on vibrate, follows the alarm
volume, and ducks a podcast for under a second instead of pausing it. Stronglifts and Fitbod
do the same and it is what a lifter expects (Justin, 2026-09-03). The alert notification
channel is therefore silent, so a phone with the ringer on does not ding twice. It does not end the rest (brief §01: HR arms Continue, never
  transitions).

`endsAt` travels with the event so a late "rest over" from an earlier rest can never end
the current one. The session controller keeps a JS timer to the same end as a fallback —
it runs on screen, and off screen too while the workout's headless task holds React's
timers; a second `restEnded` is a no-op in the machine.

## Permissions

| Android | Needed | Why |
|---|---|---|
| 14+ | `ACTIVITY_RECOGNITION` (runtime) | A health-type foreground service may only run with a sensor permission granted; this is the lightest. |
| 13+ | `POST_NOTIFICATIONS` (runtime) | The countdown and the alerts are notifications. |
| all | `FOREGROUND_SERVICE`, `FOREGROUND_SERVICE_HEALTH`, `VIBRATE`, `WAKE_LOCK` | Declared by the module's manifest. |

No permission is needed for the ding; it plays at the phone's alarm volume.

Asked once, at the first workout (`ensureRestPermissions`), and again when the session
screen opens on a workout the watch started with no screen to ask on. A refusal leaves the
JS timer alone — nothing else changes. Store submission must declare and justify the health
foreground-service type (build plan, Store submission).

## Trying it without a workout

Design Kit → **Rest timer — native, 20 s → Arm 20 s**, then lock the phone. The shade shows
the countdown; at zero the phone buzzes, dings and "Rest over" appears, and with no workout
under way the service goes away with it.
