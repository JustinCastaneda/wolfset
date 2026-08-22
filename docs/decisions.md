# WOLFSET — Decision log

Running log of decisions as they're made. The open-decisions table in `build-plan.md` is the
source for what's still undecided; entries here resolve or supersede rows there.

| Date | # | Decision | Detail |
|---|---|---|---|
| 2026-08-19 | 13 | **Expo/RN + one native Kotlin module** (not all-native) | The gate (~5% of code) is the only part that must be native. Revisit only on spike evidence: bridge latency or dropped events under doze. |
| 2026-08-21 | — | **Test watch: Pixel Watch** | Wear OS 3+, Health Services live HR. All Wear OS 3+ watches share the API, so this affects setup docs, not code. |
| 2026-08-21 | 5 | **HR sources at launch: watch only** | No BLE chest strap in v1. Spike measures optical accuracy under grip tension so this can be revisited with data. Phone-side ingestion keeps HR source as a parameter so a second source can slot in later. |
| 2026-08-21 | — | **Day 1 scope: Day Zero scaffold + full Phase 0 spike code** | Spike written end-to-end (watch → Data Layer → foreground service → RN bridge → React render); Justin runs it on hardware. |
| 2026-08-22 | — | **Watch HR streams via ExerciseClient session + `HEART_RATE_5_SECONDS` batching override** | Spike evidence (session 2): in ambient "blur" mode, sampling continues but Health Services batches *delivery* until the user looks at the watch (141 s + 38 s stalls; drains on tap). This is documented platform behavior for both MeasureClient and ExerciseClient — the fix is the BatchingMode override (needs an active exercise), giving ~5 s delivery in non-interactive states. Latency spec is therefore two numbers: interactive ≈ 3.5 s, ambient ≈ 6–8 s (platform floor, not engineerable away). Support is per-device: service tries the override, falls back without, and logs which. Carries to the real `wear/` app in Phase 7. |

## Still open (see build-plan.md for full table)

- #1 Local-first vs cloud-first (recommendation on record: local-first)
- #2 Auth in v1?
- #3 HR sample storage + downsampling (~5,400 rows/session at 1Hz)
- #4 ⚠️ Styling — NativeWind vs StyleSheet + tokens (blocks skills + Phase 3)
- #6 Micro type style @ 8px (below the ~11px mobile floor)
- #9 Separate watch design system?
- #10 Icon set — is `lucide-react-native` sufficient?
- #11 ⚠️ Progression: three strategies or one rule? (blocks Phase 1 schema)
- #12 First preset 5×5 — programmed by whom, when?
- ⚠️ **"Recovered" threshold rule** — Phase 0 exit criterion B. The 168/145/green values in
  designs are illustrative, not a rule. The gate cannot ship without this.
