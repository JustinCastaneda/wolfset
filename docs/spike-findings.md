# Phase 0 — HR Spike Findings

> Fill this in during/after each hardware session. The spike code in `spike-hr/` gets deleted
> once Phase 0 closes; **this file is what survives.** The mobile spike app exports a JSON
> session log (Share button on the metrics panel) — attach or summarize it here.

## Sessions

| Date | Watch | Phone | Duration | Notes |
|---|---|---|---|---|
| 2026-08-20 | Pixel Watch 4 | Pixel 10 Pro | 150 s | Shakedown, screen mostly on, ADB attached. Log: `wolfset-spike-1787286145549.json`. Ran with the pre-fix metrics collector — its drop/latency stats are wrong; per-sample logs are trustworthy. |
| 2026-08-22 | Pixel Watch 4 | Pixel 10 Pro | 256 s | Curls/squats/pushups, real HR spike (peak 117). Log: `wolfset-spike-1787374237862.json`. Fixed collector: 134/134 samples, 0 drops. **Identified the stall mechanism: watch ambient ("blur") mode.** |
| 2026-08-22 | Pixel Watch 4 | Pixel 10 Pro | 119 s | Validation of the batching-override fix. Log: `wolfset-spike-1787376068949.json`. **Ambient stall eliminated** — see Session 3. |

### Session 3 (2026-08-22, 119 s validation) — the ambient fix works on spec

- **Override accepted:** `bm=1` on all 63 samples — Pixel Watch 4 supports
  `HEART_RATE_5_SECONDS`.
- **60 of 63 samples sent in ambient mode** — the session ran almost entirely in the exact
  condition that stalled 141 s in session 2. Longest silence: **5.8 s**. No taps needed.
- Delivery is metronomic: batches every ~5.3 s (the override cadence), each carrying the
  2–3 samples taken in the interval. Sample completeness: 63 in 119 s ≈ the full 1.92 s
  sensor cadence, nothing lost to batching.
- **Ambient e2e: p50 6.0 s · p95 8.4 s · max 8.9 s** — inside the predicted 6–8 s spec
  (5 s batch floor + ~2 s transport). Interactive n=3, too few to score this session.
- Bridge drops: **0/63**, JS saw 63/63.

### Session 2 (2026-08-22, 256 s workout) — the stall has a name

Justin's field observation: when the watch blurs, sync stops; tapping the watch triggers a
flush. The log confirms it exactly:

- Two stalls: **141.4 s** (t+3.8→145.2, the entire workout) and **38.4 s** (t+203→241.6,
  after the 30 s screen timeout cycled the watch back to ambient). Each ended in a single
  drain burst at the moment of a tap — 75 samples in 2.8 s, then 20 samples in 0.1 s.
- Watch settings during the run: always-on display enabled, screen timeout 30 s (max).
- The watch sampled on **1920 ± 1 ms cadence through both stalls** and delivered everything
  eventually (134/134, zero loss). Ambient throttles *delivery*, not sampling — the radio
  queues messages until an interaction returns the watch to interactive mode.
- When interactive, the pipe is healthy: samples in pairs every ~4 s, oldest ~3.5 s stale —
  matches session 1's steady state.
- **This retroactively explains session 1's 72 s stall at peak HR**: peak HR is when you're
  mid-set and haven't touched the watch in 30+ s. One mechanism covers all three observed
  stalls. Bluetooth attenuation is off the hook.
- Instrument validation: the reworked collector reported 0 fabricated drops (previous
  session: 93), and the stale-signal indicator is what made Justin notice the stall live.

**Consequence — the fix is the `BatchingMode` override, not the client swap alone.** Health
Services documents this exact behavior for *both* clients: in non-interactive power states
(ambient / screen off) data is batched to save power and flushed "when the user looks at the
screen" — verbatim our tap-to-flush measurement. (Credit: Opus review caught that an
ExerciseClient swap by itself would reproduce the stall.) The spike's watch app now:

- holds an active **ExerciseClient** session (the workout-app posture; also required to set
  batching overrides at all), with the ongoing-activity chip and in-app ambient mode;
- requests **`BatchingMode.HEART_RATE_5_SECONDS`** — sampling stays 1 Hz; delivery every
  ~5 s even in non-interactive states. Support is per-device and version 1.0.0-rc02 exposes
  no capability query, so the service tries with the override and falls back without;
- stamps every sample with `amb` (1 = ambient) and `bm` (1 = override active), so the next
  log reports **two latency distributions** (interactive vs ambient) and can distinguish
  "stall with the fix on" from "fix unsupported on this watch". The watch UI shows
  `5s-batch` or `NO-OVERRIDE` next to the exercise state.

**Criterion A latency should be read as two numbers, not one.** The ~2 s target predates
knowing the platform's ambient batching floor. Realistic spec: interactive ≈ 3.5 s;
ambient ≈ 5 s batch + ~2 s transport ≈ 6–8 s. For a 90 s rest timer, unlocking within ~8 s
of true recovery is acceptable; the gate cannot ship on a pipe that needs a wrist tap.
**Next session's headline questions: does the override start (watch shows `5s-batch`), and
do samples flow while blurred without tapping? Also: battery cost of the override — Google
warns it raises power draw in non-interactive states; ADB off for the battery read.**

### Session 1 (2026-08-20, 150 s shakedown) — what the raw logs actually said

- **Pipe works end to end.** Live BPM on the phone, gate flipped, timer ran. 145 samples
  reached the native listener (seq 45–189, **zero gaps**) and every one crossed the bridge.
- **Bridge cost is negligible:** native→JS p50 2 ms / max 28 ms. The architecture decision
  (one native module + JS everything-else) holds; no all-native reconsideration warranted.
- **Steady-state e2e latency ~3.1–3.4 s p50** (backfill stripped), p95 ~6.5 s. Over the ~2 s
  target — but ~1 s of that is the watch's own 1.92 s sampling cadence (half a period of
  waiting is built in). Transport contributes ~2 s. Decide whether the 2 s bar was ever the
  right bar before optimizing toward it.
- **One 72.5 s transport stall** starting t+60 s, right at session-peak HR. The watch kept
  sampling on cadence (1920 ± 1 ms through the whole stall) and every sample was delivered —
  the backlog arrived in **one 1.9 s burst of 39 samples**. On screen: BPM froze at peak 113
  for 72 s, then snapped to 73. Cause unknown (doze vs. Bluetooth attenuation mid-set);
  next session needs watch-side logcat to tell "queued on watch" from "queued in Play
  Services". One event in one short session — rare vs. rhythmic is the 90-min question.
- **Sensor: ACCURACY_HIGH on all 145 samples**, through working sets. The grip-tension
  dropout concern did not materialize (n=1 session).
- **Watch cadence rock steady at 1.92 s** → ~2,800 samples per 90-min session.
- **Old metrics collector fabricated drops:** it reported 51/145 seen and 93 gaps, but the
  cause was React 18 batching collapsing burst deliveries into one commit (fixed in the
  collector rework, same PR as this entry). True bridge drops in session 1: **0**.
- Battery (85→84% watch over 2.5 min) too short to extrapolate; clock offset −944 ms at
  251 ms RTT, so latency figures are not clock artifacts.

### Pipe requirements discovered (carry into the product gate, Phase 2+)

1. **Staleness cutoff.** The pipe can go quiet for 70+ s while the watch keeps sampling.
   A gate that trusts "last seen BPM" silently holds (or unlocks) on stale data. Rule: no
   fresh sample for ~3× cadence (≈6 s) → BPM is *unknown*, show signal-lost, and the gate
   must not change state on it. The spike app now displays signal age for this reason.
2. **Reject out-of-order samples.** Transport delivered 2 samples out of order (JS saw 1).
   A stale low BPM arriving after a fresh high one would unlock the gate early — the unsafe
   direction. Gate must ignore any sample with seq ≤ max already seen.
3. **Burst tolerance.** Delivery is bursty even when healthy (most inter-arrivals < 500 ms
   in clumps every ~2–6 s). Anything consuming the stream must not assume one-at-a-time
   arrival — measured 39 samples in 1.9 s after the stall.

## A. Does the pipe work?

| Criterion | Result | Evidence |
|---|---|---|
| Continuous samples, screen off, doze, 90 min | ☐ pass ☐ fail | *Not run at full length. Mechanism verified in 3 short sessions; endurance/doze deferred to a casual long session during Phase 1+ (keep `spike-hr/` installed until then).* |
| Beat-to-React-render latency — interactive ≤ ~3.5 s · ambient ≤ ~8 s *(original ~2 s target predates the documented ambient batching floor; see Session 2)* | ☑ **pass** | ambient: p50 6.0 s / p95 8.4 s (s3, override on) · interactive p50 ~3.3 s (s1/s2 steady state) |
| No dropped events across the bridge under doze | ☑ **pass** *(short-session evidence)* | 0 drops across all 3 sessions: 145/145 + 134/134 + 63/63. Native→JS p50 2–10 ms. |
| Timer accurate, app backgrounded + screen off | ☐ pass ☐ fail | drift at 3:00: __ ms *(subjectively fine in s1; never formally measured — check during any future session)* |
| Battery cost per session | — | watch: __%/hr · phone: __%/hr *(sessions too short; top open question is the batching override's cost — measure with ADB off)* |
| Which API delivers live HR? | ☑ **Data Layer** | Sufficed in all 3 sessions. Watch side must be **ExerciseClient + `HEART_RATE_5_SECONDS` batching override** — MeasureClient (and ExerciseClient without the override) stalls delivery in ambient. |
| Mid-set disconnect behaviour + fallback | | *Not observed — no disconnects in 3 sessions. Staleness indicator covers detection; fallback UX is a product decision.* |
| Optical HR accuracy under grip tension | ☑ no issues seen | ACCURACY_HIGH on 100% of samples in all 3 sessions, incl. curls/squats/pushups (s2). |

## B. What is the rule?

**Define "recovered."** Candidates: absolute BPM · % of session peak · return toward resting.
The spike ships a placeholder (below 65% of session peak, floor 110 bpm) purely to exercise the
gate mechanism — it is NOT a proposal.

- Observed resting/pre-set BPM: ~65–70 (session 1 trough after full recovery)
- Observed peak during working sets: 113 (s1) · 117 (s2, curls/squats/pushups)
- BPM at the moment you subjectively felt ready to lift again: __ (do this for several sets!)
- Proposed rule: **still open — but demonstrably definable.** Session 1 captured a clean
  113→70 recovery over ~75 s; the curve shape is textbook. What's missing is the felt-ready
  anchor point, which Justin can collect casually during any Phase 1+ workout (glance at BPM
  when you'd naturally start the next set, note it several times). Not worth blocking on.

## Gate verdict

- ☑ **PASS** — pipe works; rule not yet written but clearly definable → proceed to Phase 1/2

Called 2026-08-22 by Justin. The kill-gate question was "is this product possible?" — yes on
every mechanism-level measurement:

- **Pipe:** live BPM watch→React with 0 drops across 3 sessions; ambient (wrist-down,
  mid-workout — the state that matters) delivers on a bounded ~5 s rhythm, p95 8.4 s. For a
  90 s rest timer, unlocking within ~6–9 s of true recovery is acceptable.
- **Architecture:** bridge cost 2–10 ms — the Expo/RN + one-native-module split is validated.
- **Rule:** one clean recovery curve says a threshold rule exists; anchoring it is data
  collection, not research.

Deliberately deferred (not kill risks, tracked above): 90-min endurance/doze run, battery
cost of the batching override, formal timer-drift measurement, felt-ready anchor for the
rule. **`spike-hr/` stays installed and undeleted until the endurance run happens.**

## Misc findings / surprises

- The two costliest problems were both *measurement* problems: the RN-side collector
  fabricated 93 drops (React 18 batching), and the ambient stall was nearly misread as
  "Bluetooth flakiness" when it was documented platform batching. In both cases the raw
  per-sample logs, not the summary stats, held the truth.
- The Wearable Data Layer's cert requirement bit before any hardware ran: Expo's template
  keystore ≠ the machine debug keystore, and the failure mode is silent message drops.
  Fixed with a config plugin; the apksigner check in `spike-hr/README.md` is the guard.
- Fitbit's "screen never blurs mid-workout" behavior is the visible half of what
  ExerciseClient + batching override does under the hood. The ongoing-activity chip +
  in-app ambient support in the spike is the same posture and should carry to `wear/`.
