# Phase 0 — HR Spike Findings

> Fill this in during/after each hardware session. The spike code in `spike-hr/` gets deleted
> once Phase 0 closes; **this file is what survives.** The mobile spike app exports a JSON
> session log (Share button on the metrics panel) — attach or summarize it here.

## Sessions

| Date | Watch | Phone | Duration | Notes |
|---|---|---|---|---|
| | Pixel Watch | | | |

## A. Does the pipe work?

| Criterion | Result | Evidence |
|---|---|---|
| Continuous samples, screen off, doze, 90 min | ☐ pass ☐ fail | |
| Beat-to-React-render latency < ~2s (end to end) | ☐ pass ☐ fail | avg: __ ms · p95: __ ms · max: __ ms |
| No dropped events across the bridge under doze | ☐ pass ☐ fail | dropped: __ / __ samples |
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
