# WOLFSET — Build Plan

**Last updated:** 2026-08-22 (styling + local-first decided)
**Owner:** Justin (Design/Product) · Claude Fable (Engineering)
**Stack:** Expo (Android-first) · Kotlin/Compose (Wear OS) · Supabase · Conductor + Claude Code

> **Naming:** The product is **WOLFSET**. Design files still say *Gym Wolf*. Treat every in-file
> occurrence as a stale label, never a second product. Do not carry it into identifiers, package
> names, string tables, or the splash wordmark. Wordmark is locked: **WOLF** red · **SET** white.

---

## Legend

| Icon | Meaning |
|---|---|
| 👤 | Justin — accounts, credentials, decisions, design review |
| 🤖 | Agent — code, schema, config |
| 🤝 | Paired — agent proposes, Justin approves |
| ⚠️ | Blocking or risky |

---

## Source documents

**Read these before writing code.** Claude Code has MCP access to both surfaces — dereference the
links rather than working from pasted excerpts.

### Claude Design — project `815dbad3-66dc-40b2-94d7-630a2ff8c1e1`

**Committed copies in `docs/design/` are the reliable source** (exported 2026-08-22). The links are
the live originals.

| Document | In repo | Link |
|---|---|---|
| **Handoff Brief** — rules, shared screens, gaps | `docs/design/handoff-brief.html` | https://claude.ai/design/p/815dbad3-66dc-40b2-94d7-630a2ff8c1e1?file=Handoff+Brief.dc.html |
| **Flowchart** — 55 screens, one connected graph | `docs/design/flowchart.html` | https://claude.ai/design/p/815dbad3-66dc-40b2-94d7-630a2ff8c1e1?file=Gym+Wolf+Flowchart.dc.html |
| Flows v2 | `docs/design/flows-v2.html` | https://claude.ai/design/p/815dbad3-66dc-40b2-94d7-630a2ff8c1e1?file=Gym+Wolf+Flows+v2.dc.html |
| Flows v1 *(superseded — read only if v2 is unclear)* | `docs/design/flows-v1.html` | https://claude.ai/design/p/815dbad3-66dc-40b2-94d7-630a2ff8c1e1?file=Gym+Wolf+Flows.dc.html |

These documents carry **flow and rules only**. Final screens, tokens and spacing are Figma — Figma
is king for anything visual. **`docs/figma-inventory.md`** is the crawled lookup table: every
frame and component with its node ID, mapped to the flowchart. Build from those IDs, never from
memory.

> ⚠️ **`nextset UX Storyboard.dc.html` is not a source document.** It is early brainstorming under a
> discarded product name. Do not read it, design from it, or build from it. If it appears in a
> project listing, ignore it. The scoped screen list is the flowchart; the rules are the brief.

Connect in Claude Code:
```bash
claude mcp add --scope user --transport http claude-design https://api.anthropic.com/v1/design/mcp
```

### Figma — file `1RsF6PeYzGxdTso4FZDAbp`

| Node | Link |
|---|---|
| **Design System** (`293-1647`) | https://www.figma.com/design/1RsF6PeYzGxdTso4FZDAbp/Gym-Wolf-Application?node-id=293-1647 |
| **Phone frames** (`263-1903`) | https://www.figma.com/design/1RsF6PeYzGxdTso4FZDAbp/Gym-Wolf-Application?node-id=263-1903 |
| **Watch frames** (`123-3945`) | https://www.figma.com/design/1RsF6PeYzGxdTso4FZDAbp/Gym-Wolf-Application?node-id=123-3945 |

- [x] 👤 Figma file renamed *(links above still resolve — Figma routes by file key, not slug)*
- [ ] 👤 Rename Claude Design docs → Wolfset

---

## Locked decisions

| Decision | Value |
|---|---|
| Product name | **WOLFSET** |
| Domain | wolfset.app *(not yet purchased)* |
| Store name (Apple) | `Wolfset: Workout Tracker` (24/30) |
| Typeface | **Geom** — Google Fonts, OFL, 7 weights, variable (`wght`). Cleared for app embedding. Ship the variable file, not 7 statics |
| Design tokens | Figma **Variables** are authoritative. The Colors documentation page is stale — ignore its step numbers |

---

## Day Zero — Repo

*Everything else assumes this exists. Do it first.*

- [ ] 👤 Create **private** GitHub repo `wolfset`
- [ ] 👤 Scaffold:

```
wolfset/
├── CLAUDE.md              ← project, stack, conventions, commands. Put the
│                            WOLFSET-not-Gym-Wolf rule here so every session sees it
├── .claude/
│   ├── skills/            ← project skills; override personal ones of the same name
│   └── rules/             ← subsystem-specific instructions
├── docs/
│   ├── build-plan.md
│   ├── handoff-brief.html
│   └── flowchart.html
├── spike-hr/              ← Phase 0 throwaway (deleted after; findings stay in history)
│                            full stack: Kotlin watch + service + native module + RN screen
├── mobile/                ← Expo phone app (not `app/` — expo-router uses that for routes)
└── wear/                  ← Kotlin/Compose watch app
```

- [ ] 👤 Commit this plan + the Claude Design exports to `/docs`
- [ ] 👤 `.gitignore` before the first real commit — never commit `.env` or Supabase keys

> Skills go in `.claude/skills/<name>/SKILL.md`, committed to git. Claude Code watches the directory
> and picks up edits mid-session; restart only if the directory didn't exist at session start.

---

## Architecture — the native seam

*Decided 2026-08-19. Expo/React Native, with one native module at the only seam that has to be native.*

```
┌─────────────────────────────────────────────┐
│  Wear OS app — Kotlin / Compose             │
│  Health Services → live HR sampling         │
└───────────────────┬─────────────────────────┘
                    │  Wearable Data Layer (MessageClient / DataClient)
                    ▼
┌─────────────────────────────────────────────┐
│  Native foreground service — Kotlin         │
│  • rest timer (survives screen-off/doze)    │
│  • HR stream ingestion                      │
│  • gate decision (recovered? yes/no)        │
└───────────────────┬─────────────────────────┘
                    │  event emitter → JS
                    ▼
┌─────────────────────────────────────────────┐
│  Expo / React Native — everything else      │
│  set logging · plans · onboarding ·         │
│  catalog · summaries · all UI               │
└─────────────────────────────────────────────┘
```

**Why this split**

- The watch is Kotlin either way. React Native does not meaningfully target Wear OS, so "go native" would not avoid learning Kotlin — it would only remove one seam
- [Inference] The rest timer likely cannot live in JS at all. Android throttles JS timers when backgrounded or screen-off, and the entire use case is *phone in pocket, watch on wrist, screen off*. An accurate countdown there needs a native foreground service or `AlarmManager` — true in a native app too. This is an Android property, not a framework choice
- The gate is ~5% of the code and 100% of the risk. The other 95% is ordinary app UI where RN is comfortable and the atomic component system maps cleanly
- 👤 Justin can review TypeScript and cannot review Kotlin. Confining Kotlin to one module limits unreviewable surface area
- iOS later means porting one native module, not rewriting the app

**Revisit condition — resolved ✅.** The spike measured the bridge at p50 2ms / max 28ms with zero
drops. All latency lives in watch→phone. There is no evidence for going all-native; this split stands.

✅ **Confirmed: Health Connect is the wrong API for the gate.** It is a historical store. Live
streaming is the Wearable Data Layer, driven by `ExerciseClient` on the watch.

---

## Phase 0 — HR Spike ✅ PASSED · battery cost still to be measured

*Full findings: `docs/spike-findings.md`. Summary below.*

**Verdict:** the pipe works. Watch → phone → native → React survives ambient, loses nothing, and
has bounded rhythmic latency in the state that matters. The architecture holds.

**Battery is a design constraint, not a kill-risk.** Almost no number kills the product — it changes
what the product is. But the number is an **input to Phase 1** (watch-first vs phone-first), so
measure it in parallel rather than after. Do not hold Phase 1 for it.

### ✅ What three sessions established

- [x] Live HR renders in React. Bridge is a non-issue — native→JS p50 **2ms**, max 28ms
- [x] **100% of latency is watch→phone.** The RN bridge concern was wrong; no reason to go all-native
- [x] Root cause of stalls found: **Health Services batches in ambient.** Delivery holds until the
      watch becomes interactive, then flushes. One mechanism explained all three stalls
      (141s, 38s, and session 1's 72s at peak HR — which was simply mid-set, wrist down)
- [x] **Fix: `ExerciseClient` + `BatchingMode.HEART_RATE_5_SECONDS`.** ExerciseClient *alone* does
      not fix it — it batches identically. The override is the fix
- [x] Verified on Pixel Watch 4: `bm=1` on all samples, 60/63 sent in ambient, longest silence 5.8s,
      metronomic ~5.3s delivery. No taps required
- [x] Sensor `ACCURACY_HIGH` on 100% of samples, including under load. Grip-tension worry didn't materialise
- [x] Watch samples every **1.92s**, rock steady → ~2,800 samples per 90-min session (not 5,400)
- [x] Zero loss: JS saw 63/63

### Measured latency — this is the spec now

| State | p50 | p95 | max |
|---|---|---|---|
| **Ambient** *(operating state — wrist down, mid-set)* | 6.0s | 8.4s | 8.9s |
| Interactive *(n=3, not chased — see below)* | ~5.0s | — | — |

> ⚠️ **The original "under 2s" criterion was unachievable and has been retired.** Ambient delivery is
> a 5s platform floor plus ~2s transport. 6–9s is the real spec. For a 90-second rest timer, a gate
> that unlocks within ~9s of true recovery is acceptable.

> **Interactive latency is out of scope.** Ambient is the operating state. When the screen is
> interactive the user is looking at the watch and reading the number directly. Not worth more runs.

### Run in parallel with Phase 1 — no dependency

- [ ] 👤 **90-minute endurance run.** Everything so far is 2–4 minute sessions. Phone-side doze over
      a long session is untested
- [ ] 👤 **Battery cost of the override.** Google's caution: BatchingMode *"causes increased power
      consumption; use only where absolutely necessary."* Session 1 extrapolated to ~36%/90min
      **before** the override. **Run with ADB off** — wireless debugging drains the watch
- [ ] 🤖 **Duty-cycle the override.** The gate only matters *between* sets.
      `overrideBatchingModesForActiveExercise()` can be called mid-exercise, and an empty set reverts
      to default. Enable at rest-start, clear at set-start. [Inference] Meaningful saving, no new API
- [ ] 🤖 **Probe `ExerciseGoal` for HR thresholds.** A one-time goal ("notify when HR < 110") is the
      gate's exact semantics — one wake at the crossing instead of a wake every 5s. ⚠️ Only steps,
      distance and duration goals are guaranteed across devices; HR goals need a capability check
- [ ] 👤 Mid-set disconnect behaviour — walk out of range and observe
- [ ] 🤖 Handle **out-of-order samples**. Sequence numbers went backwards in session 1. A naive
      "is BPM below threshold" check can unlock early on a stale sample

### ⚠️ Criterion B — still undefined, blocks the gate logic

- [ ] 👤 **Define "recovered."** Absolute BPM? Percentage of session peak? Return toward resting?
      The designs show 168/145 and 168/142/122 — illustrative mockup values, not a rule
- [ ] 👤 Collect felt-ready BPM across several sets, several sessions. Session 3 gave one good
      curve (113 → 70 over ~75s). **Start logging this every workout from now on**

### Locked technical decisions from the spike

| Decision | Value |
|---|---|
| Sensor API | `ExerciseClient` — **not** `MeasureClient` |
| Delivery | `BatchingMode.HEART_RATE_5_SECONDS` via `ExerciseConfig` |
| Capability check | Required — not all devices support the override |
| Service | `foregroundServiceType="health"` + `FOREGROUND_SERVICE` permission |
| Transport | Wearable Data Layer. **Not Health Connect** — that's a historical store, not a live stream |
| Ambient UI | App stays on screen in ambient does **not** prevent batching. Ambient *is* the batching state |

> `AUTO_ENDED_PERMISSION_LOST` on exercise end usually means a missing foreground service with the
> right permissions.

### Reading

- Arvo, *"Why strength training apps ignore Wear OS"* — independently reaches the same architecture
  conclusion (Health Services is Kotlin-only, RN needs a bridge). Competitive intel, worth 20 minutes

---

## Phase 1 — Definition

- [x] ✅ **Flowchart complete.** All five inferred edges resolved. Two now point at Figma gaps rather than graph gaps
- [x] ✅ **Handoff brief complete**
- [x] 👤 Commit both exports to `/docs` in the repo *(`docs/design/`, 2026-08-22)*

### Data model 🤝

- [x] Entities: exercises, sets, workouts, plans, mesocycles, HR samples → `docs/data-model.md` §2
- [ ] ⚠️ **Progression is per-exercise, not global.** Needs a per-exercise override field with a
      plan-level default
- [x] ✅ **Progression is a strategy enum** — `steady` (weight-based, default) · `reps-first` ·
      `by-feel`. Resolved 2026-08-22, see decisions.md #11. Schema needs: strategy on the exercise
      with a plan default, a per-exercise increment, and a mesocycle typed by strategy
- [x] ✅ Numbers pinned (decisions.md 11b): 5 lb increment per exercise; two consecutive
      *failures* (not misses) → the app asks deload-or-new-meso; 10% deload default, per-exercise
- [x] 🤝 Data model drafted and reviewed — `docs/data-model.md` (§6 answered, decisions 11c)
- [ ] ⚠️ **Pacing is per-exercise too.** Same field, two entry points: Add Exercise Details during
      plan build, and a settings detour off Workout A
- [x] HR sample strategy → `docs/data-model.md` HrSample + RestRecovery: keep raw locally 30 days, never sync raw in v1, persist per-rest recovery curves *(proposed, #3)*

### Architecture 🤝

- [ ] Local-first vs cloud-first → *recommendation: local-first, gyms have no signal*
- [ ] Auth in v1?
- [ ] Sync conflict strategy
- [ ] Offline behaviour for every write path

---

## Phase 2 — Foundation

### Justin's setup

- [x] 👤 Node LTS, `npm i -g eas-cli`, `eas login`
- [x] 👤 Expo account
- [x] 👤 Supabase project — record URL + anon key *(project created; keys not needed until
      Phase 6 — `mobile/.env.example` documents where they go and why the anon key is public)*
- [x] 👤 Secrets stored safely, **never committed** *(`.env` gitignored + verified via
      `git check-ignore`; CI fails if a `.env` is ever tracked)*
- [ ] 👤 Figma Desktop MCP in Claude Code (OAuth, Pro — verified)
- [ ] 👤 Claude Design MCP: `claude mcp add --scope user --transport http claude-design https://api.anthropic.com/v1/design/mcp`
- [ ] 👤 Verify both with `/mcp` inside a Conductor session
- [ ] 👤 Conductor workspace pointed at the repo
- [ ] 👤 Physical Android device in dev mode (emulators give no real HR)

### Agent setup

- [x] 🤖 Expo bootstrapped, TypeScript strict *(SDK 57, expo-router, `minSdkVersion 26`,
      `app.wolfset`, dark UI. Demo template content stripped. expo-doctor 21/21)*
- [x] 🤖 Folder structure + naming conventions documented *(`mobile/README.md`)*
- [x] 🤖 Lint / format / typecheck *(`npm run verify` = tsc + eslint + prettier)*.
      Pre-commit hook deferred: CI is the enforcement point, and a hook in a subdirectory
      package needs `core.hooksPath` set per clone — friction without added safety
- [x] 🤖 CI: typecheck + lint + format on PR, plus a tracked-`.env` guard.
      *Build/test jobs land when there is a build worth running (Phase 4) and tests to run*
- [x] 🤖 `.env` handling, secret hygiene *(`.env.example`; `EXPO_PUBLIC_*` semantics documented)*

### Skills ⚠️ before any parallel agent work

*Unblocked 2026-08-22 — #4 resolved: `StyleSheet` + typed tokens.*

- [x] 🤝 `wolfset-conventions` — structure, naming, state, errors, testing *(drafted; Justin reviews)*
- [ ] 🤝 `design-system-authoring` — Phase 3 only. **Creating** components: token discipline, variant completeness, fidelity
- [ ] 🤝 `screen-implementation` — Phase 5 only. **Consuming** components: never recreate, compose only, Code Connect
- [x] ✅ `figma-atomic-composition` — genericized, ready

> Two implementation skills, not one. Phase 3 creates components; Phase 5 forbids creating them.

---

## Phase 3 — Design System

### 3a. Tokens

- [ ] 🤖 ⚠️ **Fix blue's numbering.** Red/yellow/green/neutral run `50…900` with 600. Blue still runs
      `…500, 700, 800, 900, 950`. Rename blue 700→600, 800→700, 900→800, 950→900 so all five align
- [ ] 🤖 Export primitives from Figma Variables (~45 colors, already namespaced `red/500` style)
- [ ] 👤 Verify semantic aliases genuinely **alias** primitives rather than holding copied hexes
- [ ] 🤖 **Restructure the semantic layer** (currently flat: `Brand`, `Red`, `Accent`, `MutedBackground`, `TextButton`)

```
color/brand          → red/500      #f04245
color/error          → red/300      #bf3335   ⚠️ must differ from brand
color/success        → green/600
color/warning        → yellow/500
color/bg/base        → neutral/900
color/bg/raised      → neutral/800
color/text/primary   → neutral/50
color/text/muted     → neutral/300
color/border         → neutral/700

progression/increase → green/600
progression/decrease → red/300
progression/hold     → yellow/500
timer/resting        → red/500
timer/approaching    → yellow/500
timer/ready          → green/500
hr/above-threshold   → red/500
hr/below-threshold   → green/500
```

> `Brand` and `Red` are both `#f04245`. Renaming `Red` → `Error` as-is makes error states pixel-identical
> to primary buttons. Error needs its own value.

- [x] 👤 All 14 type styles are Variables (done 2026-08-31, verified via `get_variable_defs`)
- [ ] 🤖 Type scale — export the 14 styles into `tokens.ts`
- [ ] 🤖 Spacing, radii, elevation
- [ ] 👤 ⚠️ Decide **Micro @ 8px** — below the ~11px mobile floor, fails under font scaling

### 3b. Code Connect

- [ ] 👤 Figma file renamed first
- [ ] 🤖 `figma-code-connect` skill loaded
- [ ] 🤖 Mappings created (`.figma.ts`)
- [ ] 🤝 Verify agents pull component metadata, not screenshots

### 3c. Components — workout path first

**Exists in Figma** (17): Button (24-variant matrix), Weight (plate stack 2.5–55), Top Bar, Icon Card, Avatar, Chip, Input, Select, Textarea, Switch, Watermark, **Card, Radio Card, Button Group, Checkbox, Icon (22 custom), Bottom Drawer** (last six landed by 2026-08-31). Select/List Item exists but lives outside the library. Node IDs: `docs/figma-inventory.md`.

**Must be designed and built** — used across screens, not in the library:

- [ ] 🤝 **Timer ring** — the core differentiator UI
- [ ] 🤝 **Numeric keypad** — custom, not OS. Numeric only, **44px minimum targets**. Built because the OS pad's keys are too small for gym use, eats the screen the set row needs, and can't host the ± buttons
- [ ] 🤝 **Set / Exercise row**
- [ ] 🤝 **Card**
- [ ] 🤝 **Stepper (±5)**
- [ ] 🤝 **Segmented progress bar**
- [ ] 🤝 **List item** *(exists as `114:2626` "Select/List Item"; move into the library)*
- [x] 🤝 **Button Group** — componentised in Figma (`373:7703`, 2026-08-31)
- [ ] 🤝 **By Feel poke grid** — the 2D form × reserve input (`384:10881`); core to the By Feel loop

Build order: Button → Input → Chip → Top Bar → large numeral → Timer ring → keypad → remainder.

### 3d. Design Kit page ⚠️ blocks Phase 4

*Justin's rule (2026-08-22): the Design Kit exists in the app before any serious flow is built.
Phase 4 does not start until 3d renders every component. Err on the side of making a component
whenever a pattern repeats.*

- [ ] 🤖 Route rendering every component and variant
- [ ] 🤖 Behind a **compile-time flag** so it tree-shakes out of production
- [ ] 👤 This is the fidelity verification surface — resolves open decision #7

---

## Phase 4 — First Vertical Slice 🎯

**The Set Loop** — one state machine, five screens, six transitions. Build it as a state machine, not as screens.

```
Log a Set ──log──────────────► Post Set Timer
Post Set Timer ──0:00 OR Continue──► Log a Set     (ONE path, two triggers)
  └─ sets exhausted ──► next lift, loop restarts
  └─ last lift done ──► Workout Summary
Workout Summary ──Finish──► Session Done ──► tiles
Log a Set ◄──tap weight / save──► Edit Weights     (detour, not a step)
```

- [ ] 🤖 Log a Set — "tap the number to decrease reps"
- [ ] 🤖 Post Set Timer — auto-starts, never user-chosen
- [ ] 🤖 **HR gate unlocks next set**
- [ ] 🤖 Edit Weights — ±5 and keypad
- [ ] 🤖 Loop until sets exhausted

> ⚠️ `0:00` and `Continue` are **the same transition**. Do not build two paths.
> ⚠️ Freestyle sets are open-ended — "sets exhausted" has no meaning there. The loop ends only when
> the user ends it. The shared engine must handle both.

### 🏋️ MILESTONE: First real workout logged in Wolfset

- [ ] 👤 Full 5x5 session logged
- [ ] 👤 Notes on what felt wrong
- [ ] 🤝 Revise plan

---

## Phase 5 — Remaining Flows

**55 frames ≠ 55 screens.** Journeys were drawn end to end and the shared middle was redrawn each time. Building frame-for-frame produces copies that drift.

| Frames | Build | Note |
|---|---|---|
| Log a Set (multiple) | **1** | Plan and freestyle both land here |
| Edit Weights ×3 | **1** | +5 / −5 / keypad states |
| Post Set Timer ×3 | **1** | Three HR states. Two frames still named `Android Compact – 2` / `– 3` |
| Workout Summary | **1** | Title is "Freestyle" or "Workout A" — the only difference |
| Getting Started + Create New MesoCycle | **1** | Same flow, second entry via Change It Up hub |
| Confirm Email Timer ×4 | **1** | One screen with a cooldown state |

Order:

- [ ] Set Workflow *(done in Phase 4)*
- [ ] Post Set Timer full states + Pacing Override detour
- [ ] Next Workout / Workout A
- [ ] Freestyle — **after** Set Workflow, needs the engine to handle open-ended sets
- [ ] Getting Started **(= Create New MesoCycle — one build)**
- [ ] Add Exercise Details · Progression Override · Pacing Override
- [ ] Day Summary · Plan Summary
- [ ] Onboarding — Setup → Equipment → Goals → Select a Plan (all skippable)
- [ ] Search Exercise / Add Exercise
- [ ] Edit Set — reached from a logged row, not from the timer
- [ ] Session Done — exits to Add to Plan / New Meso
- [ ] Auth flows *(only if Phase 1 put auth in v1)*

Per flow: 🤖 build → 👤 review → 👤 use in a real session → 🤝 fix

---

## ⚠️ Not designed yet — stop and ask

**Five known gaps with agreed behaviour and no frames. An agent that fills these from pattern memory produces screens that get thrown away.**

- [ ] **Preset plan review** — picking a preset from Select a Plan drops the user at the *end* of plan build: the whole workout as a summary. Accept takes it as-is; clicking any row opens the same editors a hand-builder would use. Blocked on the plans themselves. First preset is a 5×5
- [ ] **Watch weight adjust** — the watch set screen has two swipe panels. Left is Actions (Skip Set / Change / End) and is drawn. **Up adjusts weight** — Edit Weights' job, watch-sized — and is missing
- [ ] **Editing a live plan** — changing an exercise inside a running mesocycle without starting over. Not drawn, no flowchart edge
- [ ] **Plateau prompt** — after two consecutive failures on an exercise the app asks *deload or end
      the meso?* (decisions 11b). Still no frame — the absence-deload card (`359:1470`) is the
      obvious template for it
- [x] **Absence deload** — ✅ designed (`359:1470`, 2026-08-31): "You have missed 2 workouts →
      Deload all exercises by 10%", Decline / Accept, on Workout A
- [x] **By Feel progression** — ✅ designed: the Calculation Engine (`384:11049`) + poke grid
      (`384:10881`). 🤖 Follow-up: implement the engine in `features/progression/` (the current
      by-feel code predates the spec)
- [ ] **Settings flows** — designed 2026-08-31 (5 screens + subscreens, incl. Exercise Data with
      export). Fold into Phase 5 scope; export format 👤 undecided

---

## Phase 6 — Supabase

- [ ] 🤖 Schema from Phase 1 data model
- [ ] 🤖 Row-level security policies
- [ ] 👤 Review RLS — this is where data leaks
- [ ] 🤖 Sync layer wired to local store
- [ ] 🤝 Conflict resolution tested
- [ ] 👤 Airplane mode for a full workout, then reconnect

---

## Phase 7 — Wear OS

*Phase 0 proved the mechanism. Watch frames: `node-id=123-3945`.*

- [ ] 🤝 Separate watch token set, or ported primitives?
- [ ] 🤖 Watch Tile — cardio above, Next Workout below, reads today off the phone
- [ ] 🤖 Set screen — 5 pips on the rail
- [ ] 🤖 Timer — watch HR states (168 / 142 / 122)
- [ ] 🤖 Actions panel (swipe left) — Skip Set / Change / End
- [ ] 🤝 **Adjust Weight (swipe up)** — needs design first
- [ ] 🤖 Change Workout — A marked Current, B with a Do B button
- [ ] 🤖 End Workout — "Only 3 of 5 sets done. May trigger a deload."
- [ ] 🤖 Session Done — time, volume, avg bpm, exercise count
- [ ] 🤖 Phone ↔ watch sync

> Both surfaces close the same way: Finish → Session Done → back to the opening tiles.

---

## Deferred

**Store submission** *(verified 2026-08-17)*

- [ ] Privacy policy — mandatory both stores. Apple: App Store Connect URL. Google: Play Console **and** in-app, publicly accessible, non-geofenced. One canonical URL
- [ ] Support URL — required App Store Connect field
- [ ] Terms of Service — not required at launch if free; Apple's standard EULA covers you. ⚠️ Mandatory with auto-renewable subscriptions, in **both** the binary (paywall) and the store description
- [ ] **Health apps declaration** — Play Console → Monitor & Improve → Policy → App content. Covers the Wear OS app. Request heart rate only
- [ ] Declare `foregroundServiceType="health"` and justify it — required by `ExerciseClient`, and a
      health-type foreground service draws policy scrutiny at review

**Other**

- [ ] wolfset.app landing page
- [ ] Store listing — subtitle (30), keywords (100), screenshots
- [ ] Screenshot captions — Apple OCR-indexes the first 3
- [ ] Marketing / launch
- [ ] wolfset.com ($4k ask — only after there are users)
- [ ] TM attorney clearance before filing

---

## Open decisions

| # | Question | Owner | Blocks |
|---|---|---|---|
| 1 | ~~Local-first or cloud-first?~~ | — | ✅ Local-first. Device DB is truth, Supabase syncs (Phase 6). Engine chosen with the schema |
| 2 | Auth in v1? | Justin | Phase 5 |
| 3 | HR sample storage + downsampling (~2,800 samples/90min at 1.92s cadence) | Fable | Phase 1 |
| 4 | ~~Styling — NativeWind vs StyleSheet + tokens~~ | — | ✅ `StyleSheet` + typed tokens (`src/theme/tokens.ts`, Phase 3a). See decisions.md |
| 13 | ~~Expo/RN vs all-native Kotlin?~~ | — | ✅ Expo + one native module. Revisit only on spike evidence |
| 5 | Supported HR devices at launch — Pixel Watch 4 verified; others need capability checks | Justin | Phase 7 |
| 6 | Micro @ 8px | Justin | Phase 3a |
| 7 | ~~Fidelity verification method~~ | — | ✅ UI Kit page |
| 8 | ~~Figma tokens real Variables?~~ | — | ✅ Yes, namespaced |
| 9 | Separate watch design system? — 👤 **WIP section exists** (`364:2816`, 2026-08-31) | Justin | Phase 7 |
| 10 | Icon set — ✅ custom WolfSet set for domain icons (`436:4844`, 22 variants); lucide only for UI chrome. Confirm chrome choice at 3c | Justin | Phase 3c |
| 11 | ~~Progression: three strategies or one rule?~~ | — | ✅ Strategy enum, `steady` (progressive overload, weight-based) default; `reps-first`; `by-feel` last. Mesocycle typed by strategy. Increment size / plateau rule / −10% deload scope still to pin (decisions.md) |
| 12 | First preset 5×5 — programmed by whom, when? | Justin | Preset gap |

---

## Notes

- **Phase 0 passed.** Battery cost and Criterion B (the recovered rule) run in parallel with Phase 1
  definition work — neither blocks it.
- **Competitors on Wear OS:** GymPsycho ships live HR on-watch with aggregates pushed to the phone —
  the same architecture. Hevy already has standalone watch logging (phone in the locker). Worth an
  hour of review before locking the watch scope.
- Geom is on Google Fonts and available on the web — the flowchart's note that it isn't (and its
  Barlow fallback) is incorrect. Cosmetic for a flowchart; don't let it propagate into the app.
- Rename the Figma file before Code Connect. Stale names propagate.
