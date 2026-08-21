# spike-hr — Phase 0 HR Spike ⚠️ KILL GATE

Throwaway code. Deliberately ugly. Deleted after Phase 0 closes — findings go to
`docs/spike-findings.md`, which is the artifact that survives.

**What it proves (or kills):** live heart rate from a Pixel Watch → Wearable Data Layer →
Kotlin foreground service on the phone → **across the RN bridge** → rendered in React, under
~2 s end-to-end, with no dropped events, screen off, for 90 minutes. Plus a rest timer that
stays accurate with the app backgrounded. The bridge crossing is the point — watch→phone in
pure Kotlin would validate the wrong half.

## Pieces

| Path | What | Language |
|---|---|---|
| `wear/` | Watch app: Health Services `MeasureClient` in a foreground service, streams every sample (seq, bpm, accuracy, watch clock, battery) over `MessageClient`; answers latency pings | Kotlin/Compose |
| `mobile/modules/spike-hr/` | The native seam: `DataLayerListenerService` (receives samples in any app state), `SessionService` (foreground service: doze-proof rest timer + clock-skew pings), placeholder gate rule, Expo module emitting events to JS | Kotlin |
| `mobile/` | Expo dev-client app: live BPM, gated timer, metrics panel (e2e latency percentiles, drops, battery), JSON session export | TypeScript |

Message protocol (`/wolfset-spike/hr`, `/ping`, `/pong`) is duplicated by hand on both sides —
fine for a spike, keep in sync manually.

> ⚠️ **The Wearable Data Layer only routes between watch/phone apps that share the same
> `applicationId` (`app.wolfset.spike`) and the same signing certificate.** Build both apps
> on the same machine so they share your `~/.android/debug.keystore`. An EAS cloud build signs
> with EAS-managed credentials and will NOT talk to a locally built watch app — use local
> builds for the spike (or configure EAS `credentials.json` with your debug keystore).

**Placeholder gate rule** (`SpikeBus.evaluateGate`): recovered when BPM ≤ 65% of session peak,
floor 110. It exists to exercise the mechanism. It is **not** the product rule — defining the
real one from session data is exit criterion B.

## Build & install

### Watch app (needs Android Studio or a JDK17 + Android SDK)

```bash
cd spike-hr/wear
./gradlew assembleDebug          # or open in Android Studio and Run
# Pair watch for ADB: Pixel Watch → Settings → System → About → tap Build number 7×,
# then Developer options → Wireless debugging → Pair new device
adb connect <watch-ip>:<port>
adb -s <watch-ip>:<port> install app/build/outputs/apk/debug/app-debug.apk
```

### Phone app (needs an Expo **dev build** — Expo Go cannot load the native module)

```bash
cd spike-hr/mobile
npm install
npx expo-doctor && npx expo install --check   # habit, per build plan

# Local debug build (Android Studio / SDK on your machine, phone plugged in).
# This signs with the same debug keystore as the watch build — required, see warning above:
npx expo run:android

# (EAS cloud builds work for later phases, but for the spike the signature must match the
#  watch build — see the Data Layer warning above.)
```

First run: accept the notification permission; on the watch, tap **Start** and grant the
Body Sensors permission. On the phone tap **Start session**.

## The protocol (wear it through a real 5×5)

1. Charge the watch the night before. Note watch + phone battery %.
2. Start the watch app (Start), phone app (Start session). Confirm live BPM on both.
3. Start a rest timer (3:00), then **turn both screens off and pocket the phone**. That state —
   watch on wrist, phone in pocket, screens off — is the entire product; test in it.
4. Lift. Between sets, glance at the phone: is the gate honest? Note the BPM at which you
   *felt* ready vs what the placeholder said — that data defines the real rule.
5. Go 90 minutes. Somewhere in the middle, force doze to make sure nothing dies:
   `adb shell dumpsys deviceidle force-idle` (and later `unforce`).
6. Also try: walk out of Bluetooth range mid-set (mid-set disconnect behaviour), grip the bar
   hard on a heavy set and watch accuracy/availability (optical HR under grip tension).
7. End session → **Export JSON** → file numbers + verdicts in `docs/spike-findings.md`.

## What the metrics panel means

- **beat → render (e2e)** — watch sensor timestamp (skew-corrected via ping/pong) to React
  commit. The ~2 s exit criterion. Red if p95 blows it.
- **watch → phone** vs **bridge → JS** — where the latency lives. If the bridge is the
  problem, that's the evidence that would justify going all-native (build plan, architecture).
- **samples JS / native** — native count is ground truth (kept even while JS is asleep);
  a JS count that lags it under doze = the bridge dropped or deferred events.
- **dropped (seq gaps)** — samples the *phone never got* (transport loss).
- **done drift** — timer accuracy: actual "done" arrival vs when it was due.

## Known spike-level compromises (deliberate)

- `MeasureClient` is the high-power always-on API; production would likely use
  `ExerciseClient` with batching overrides. The spike *measures* what the simple API costs.
- Partial wakelocks on both services — heavy-handed, but it isolates the variable we care
  about (the transport + bridge), not Android's process politics.
- Exact-alarm permission may be denied on Android 14+; the service falls back to an inexact
  alarm and the drift shows up in **done drift** — that's data, not a bug.
