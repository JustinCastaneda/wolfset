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

Phase 0 — the HR spike is written and awaiting a hardware run (Pixel Watch + Android phone).
The spike is a kill gate: live BPM rendered in React under ~2s end-to-end, plus a working
definition of "recovered", before product code begins. Protocol and exit criteria:
`spike-hr/README.md` and `docs/spike-findings.md`.
