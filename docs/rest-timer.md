# The rest timer — on screen and in the pocket

Two timers, one truth.

**The machine (JS) is the truth.** A rest is `startedAt + restSeconds`, absolute wall-clock
timestamps in the session state (`features/set-loop/machine.ts`). Whenever the screen is on,
the Post Set Timer counts down from those and ends the rest itself. A killed app resumes a
running rest from its snapshot. Nothing native is needed for correctness.

**The native service holds the rest when the screen is off.** Android throttles JS timers
once the screen is off and the phone is in a pocket — exactly when a rest runs. So every
rest is also handed to `RestTimerService` in the native module (`mobile/modules/wolfset-hr`),
a health-type foreground service that:

- holds a partial wake lock for the length of the rest (plus a 10 s margin);
- shows a live countdown in the notification shade (drawn by the system, no ticking);
- at the end, buzzes, **dings** and posts **"Rest over"**, and sends `onRestEnded { at, endsAt }`
  to JS — the machine ends the rest there, with the native time, so the recorded rest is exact;
- watches the heart-rate bus: the first sample under the recovered threshold (120 bpm,
  `features/hr/recovered.ts`) buzzes and dings once and posts **"Recovered"** — the gate's
  verdict, delivered while JS sleeps.

**The ding** is a bundled bell (`modules/wolfset-hr/android/src/main/res/raw/rest_ding.wav`,
a synthesized C6 with a short decay) played by the service on the **alarm stream**, not by
the notification: it sounds through headphones with the phone on vibrate, follows the alarm
volume, and ducks a podcast for under a second instead of pausing it. Stronglifts and Fitbod
do the same and it is what a lifter expects (Justin, 2026-09-03). The alert notification
channel is therefore silent, so a phone with the ringer on does not ding twice. It does not end the rest (brief §01: HR arms Continue, never
  transitions).

`endsAt` travels with the event so a late "rest over" from an earlier rest can never end
the current one. The on-screen clock keeps its own end as a fallback; a second `restEnded`
is a no-op in the machine.

## Permissions

| Android | Needed | Why |
|---|---|---|
| 14+ | `ACTIVITY_RECOGNITION` (runtime) | A health-type foreground service may only run with a sensor permission granted; this is the lightest. |
| 13+ | `POST_NOTIFICATIONS` (runtime) | The countdown and the alerts are notifications. |
| all | `FOREGROUND_SERVICE`, `FOREGROUND_SERVICE_HEALTH`, `VIBRATE`, `WAKE_LOCK` | Declared by the module's manifest. |

No permission is needed for the ding; it plays at the phone's alarm volume.

Asked once, at the first workout (`ensureRestPermissions`). A refusal leaves the on-screen
timer alone — nothing else changes. Store submission must declare and justify the health
foreground-service type (build plan, Store submission).

## Trying it without a workout

Design Kit → **Rest timer — native, 20 s → Arm 20 s**, then lock the phone. The shade shows
the countdown; at zero the phone buzzes and "Rest over" appears. Inject **110 bpm** while it
runs for the "Recovered" buzz.
