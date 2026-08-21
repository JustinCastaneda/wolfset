# Phase 0 — HR Spike Findings

> Fill this in during/after each hardware session. The spike code in `spike-hr/` gets deleted
> once Phase 0 closes; **this file is what survives.** The mobile spike app exports a JSON
> session log (Share button on the metrics panel) — attach or summarize it here.

## Sessions

| Date | Watch | Phone | Duration | Notes |
|---|---|---|---|---|
| 2026-08-20 | Pixel Watch 4 | Pixel 10 Pro | 150 s | Shakedown, screen mostly on, ADB attached. Log: `wolfset-spike-1787286145549.json`. Ran with the pre-fix metrics collector — its drop/latency stats are wrong; per-sample logs are trustworthy. |

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
| Continuous samples, screen off, doze, 90 min | ☐ pass ☐ fail | |
| Beat-to-React-render latency < ~2s (end to end) | ☐ pass ☐ fail | avg: __ ms · p95: __ ms · max: __ ms *(s1 steady-state p50 ~3.3 s — see Session 1)* |
| No dropped events across the bridge under doze | ☐ pass ☐ fail | dropped: __ / __ samples *(s1: 0/145, but 150 s screen-on — not the doze test)* |
| Timer accurate, app backgrounded + screen off | ☐ pass ☐ fail | drift at 3:00: __ ms |
| Battery cost per session | — | watch: __%/hr · phone: __%/hr |
| Which API delivers live HR? | ☐ Data Layer ☐ Health Connect | *(spike implements Data Layer; record if it sufficed)* |
| Mid-set disconnect behaviour + fallback | | |
| Optical HR accuracy under grip tension | | *(watch for dropouts / UNAVAILABLE availability during heavy grip sets)* |

## B. What is the rule?

**Define "recovered."** Candidates: absolute BPM · % of session peak · return toward resting.
The spike ships a placeholder (below 65% of session peak, floor 110 bpm) purely to exercise the
gate mechanism — it is NOT a proposal.

- Observed resting/pre-set BPM: __
- Observed peak during working sets: __
- BPM at the moment you subjectively felt ready to lift again: __ (do this for several sets!)
- Proposed rule: __

## Gate verdict

- ☐ **PASS** — pipe works, rule defined → proceed to Phase 1/2
- ☐ **Pipe failed** → reconsider all-native (see build-plan architecture section)
- ☐ **Rule undefinable** → reconsider the product

## Misc findings / surprises

-
