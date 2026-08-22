# WOLFSET — Decision log

Running log of decisions as they're made. The open-decisions table in `build-plan.md` is the
source for what's still undecided; entries here resolve or supersede rows there.

| Date | # | Decision | Detail |
|---|---|---|---|
| 2026-08-19 | 13 | **Expo/RN + one native Kotlin module** (not all-native) | The gate (~5% of code) is the only part that must be native. Revisit only on spike evidence: bridge latency or dropped events under doze. |
| 2026-08-21 | — | **Test watch: Pixel Watch** | Wear OS 3+, Health Services live HR. All Wear OS 3+ watches share the API, so this affects setup docs, not code. |
| 2026-08-21 | 5 | **HR sources at launch: watch only** | No BLE chest strap in v1. Spike measures optical accuracy under grip tension so this can be revisited with data. Phone-side ingestion keeps HR source as a parameter so a second source can slot in later. |
| 2026-08-21 | — | **Day 1 scope: Day Zero scaffold + full Phase 0 spike code** | Spike written end-to-end (watch → Data Layer → foreground service → RN bridge → React render); Justin runs it on hardware. |
| 2026-08-22 | — | **Phase 0 gate: PASS — proceed to Phase 1/2** | Called by Justin after session 3 validated the ambient fix (p50 6.0 s / p95 8.4 s in ambient, 0 drops across 3 sessions). "Recovered" rule not yet written but demonstrably definable (clean 113→70/75 s curve); felt-ready anchor to be collected casually during Phase 1+ workouts. Deferred, tracked in spike-findings: 90-min endurance run, battery cost of batching override, timer-drift measurement. `spike-hr/` stays installed until the endurance run. |
| 2026-08-22 | — | **Watch HR streams via ExerciseClient session + `HEART_RATE_5_SECONDS` batching override** | Spike evidence (session 2): in ambient "blur" mode, sampling continues but Health Services batches *delivery* until the user looks at the watch (141 s + 38 s stalls; drains on tap). This is documented platform behavior for both MeasureClient and ExerciseClient — the fix is the BatchingMode override (needs an active exercise), giving ~5 s delivery in non-interactive states. Latency spec is therefore two numbers: interactive ≈ 3.5 s, ambient ≈ 6–8 s (platform floor, not engineerable away). Support is per-device: service tries the override, falls back without, and logs which. Carries to the real `wear/` app in Phase 7. |
| 2026-08-22 | 4 | **Styling: `StyleSheet` + a typed token module** (not NativeWind) | Figma Variables are the contract; they map 1:1 to `src/theme/tokens.ts` (Phase 3a), and TypeScript strict turns a wrong token into a compile error CI can show. NativeWind would add Tailwind + a Babel/Metro CSS pipeline (a recurring break point on Expo SDK upgrades, and untested with `reactCompiler`), put tokens in a second source of truth (`tailwind.config`), and hide typos in `className` strings that `tsc` never sees. Its strengths — light/dark modes, responsive variants — buy nothing in a dark-only, phone-only app. Cost: more verbose than utility classes; accepted. Unblocks the skills and Phase 3. |
| 2026-08-22 | 1 | **Local-first.** Device database is the source of truth; Supabase is sync, not storage | Gyms have no signal, and the set loop + HR gate must work with the phone in airplane mode. Every write lands locally first and syncs later (Phase 6). Storage engine (`expo-sqlite` is the default candidate) is chosen with the schema, after #11 is resolved. Consequence for Phase 1: every write path needs an offline story, and auth (#2) is not allowed to gate logging a set. |
| 2026-08-22 | 11 | **Progression is a strategy enum; `steady` (progressive overload) is the default** | Three strategies, each a per-exercise setting with a plan-level default. **`steady`** — weight-based: hit every prescribed set/rep → next session adds a per-exercise increment (2.5–5 lb) and keeps climbing until a ceiling; that climb *is* the mesocycle, and a new mesocycle is how a plateau is broken. **`reps-first`** — rep-based: weight holds, reps climb week over week, then weight steps up. **`by-feel`** — user picks weight or reps each time; built last, least common. A mesocycle is therefore typed by its strategy (weight-based vs rep-based), not one shape. Justin's call. **Still to pin down (defaults proposed, not decided):** increment size (default 5 lb, per exercise), what ends a mesocycle numerically (proposed: 2 consecutive sessions missing the target → suggest a new meso), and whether "missed → drop 10%" (the rule on the Progression Override screen and in the brief) is the shared deload for every strategy or `reps-first`'s rule only — the Figma screen copy may need updating once that's answered. |

## Still open (see build-plan.md for full table)

- #2 Auth in v1?
- #3 HR sample storage + downsampling (~5,400 rows/session at 1Hz)
- #6 Micro type style @ 8px (below the ~11px mobile floor)
- #9 Separate watch design system?
- #10 Icon set — is `lucide-react-native` sufficient?
- #12 First preset 5×5 — programmed by whom, when?
- ⚠️ **"Recovered" threshold rule** — Phase 0 exit criterion B. The 168/145/green values in
  designs are illustrative, not a rule. The gate cannot ship without this.
