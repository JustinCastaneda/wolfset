# WOLFSET

A workout app centered around weight lifting, sets, and ease of use. Get to work with fewer
clicks — and a rest timer gated on your actual heart-rate recovery, read live off a Wear OS
watch.

> Wordmark: **WOLF** red · **SET** white. Older design files say *Gym Wolf* — same product,
> stale name. See `CLAUDE.md` for the naming rule.

## Layout

| Path | What it is |
|---|---|
| `docs/` | Build plan, decision log, spike findings, design exports |
| `spike-hr/` | **Phase 0 HR spike** — throwaway full-stack proof: watch → phone → native service → React render. Start at `spike-hr/README.md` |
| `mobile/` | The real Expo phone app (Phase 2+, not started) |
| `wear/` | The real Kotlin/Compose watch app (Phase 7, not started) |
| `.claude/` | Project skills and rules for agent sessions |

## Status

**Phase 0 gate: PASSED (2026-08-22)** — three hardware sessions (Pixel Watch 4 + Pixel 10
Pro) proved the pipe: live BPM watch→React with zero drops, ambient-mode delivery on a
bounded ~5 s rhythm (p95 8.4 s) via ExerciseClient + batching override, bridge cost ~2–10 ms.
Full evidence and the deferred items (90-min endurance run, battery, "recovered" rule
anchor): `docs/spike-findings.md`. Next: Phase 1/2 — the real app in `mobile/`.
`spike-hr/` stays until the endurance run has happened.
