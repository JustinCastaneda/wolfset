# WOLFSET — Build Plan

**Last updated:** 2026-08-19
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

| Document | Link |
|---|---|
| **Handoff Brief** — rules, shared screens, gaps | https://claude.ai/design/p/815dbad3-66dc-40b2-94d7-630a2ff8c1e1?file=Handoff+Brief.dc.html |
| **Flowchart** — 55 screens, one connected graph | https://claude.ai/design/p/815dbad3-66dc-40b2-94d7-630a2ff8c1e1?file=Gym+Wolf+Flowchart.dc.html |
| Flows v2 | https://claude.ai/design/p/815dbad3-66dc-40b2-94d7-630a2ff8c1e1?file=Gym+Wolf+Flows+v2.dc.html |
| Flows v1 *(superseded — read only if v2 is unclear)* | https://claude.ai/design/p/815dbad3-66dc-40b2-94d7-630a2ff8c1e1?file=Gym+Wolf+Flows.dc.html |

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

- [ ] 👤 Rename Figma file → `Wolfset` (URL slug changes; update links above)
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

**Revisit if:** the Phase 0 spike shows the JS bridge adds unacceptable latency or drops events under doze. That is the evidence that would justify going all-native — not a guess.

[Inference] **Health Connect is probably the wrong API for the gate.** It is a data *store* for historical records. Live streaming is the Wearable Data Layer. Phase 0 confirms which.

---

## Phase 0 — HR Spike ⚠️ KILL GATE

*Throwaway code in `spike-hr/`. Ugly. Delete it after — keep the findings.*

> ⚠️ **The spike must cross the RN bridge.** Proving watch→phone in pure Kotlin validates the wrong
> half. If the bridge is where latency or dropped events live, that must surface now — not after
> fifty components exist.

### Setup

- [ ] 👤 Confirm test watch (Galaxy / Pixel / other) — **charge it the night before**
- [ ] 👤 Developer mode + ADB on watch and phone
- [ ] 👤 Android Studio + Wear OS SDK
- [ ] 👤 Decide: BLE chest strap support at launch?
- [ ] 👤 EAS dev build pipeline green **before** spike day — Expo Go cannot load native modules,
      so every HR test needs a real dev build. Budget for cloud queue time and keystore setup
- [ ] 🤖 `minSdkVersion: 26` via `expo-build-properties` (Health Connect requires it; Expo defaults lower)
- [ ] 🤖 Use `react-native-health-connect`, **not** the deprecated `expo-health-connect` — both
      installed causes a duplicate `HealthConnectPackage` class and the Android build fails
- [ ] 🤖 Habit: `npx expo-doctor` && `npx expo install --check` before every prebuild

### Build — full stack, not half

- [ ] 🤖 Wear OS (Kotlin): sample live HR via Health Services
- [ ] 🤖 Transport: Data Layer → phone
- [ ] 🤖 Foreground service (Kotlin): ingest stream, run a countdown
- [ ] 🤖 Native module: emit HR + timer state to JS
- [ ] 🤖 React component: render live BPM and the countdown
- [ ] 👤 Wear it through a real 5x5 session

### Exit criteria

**A. Does the pipe work?**

- [ ] Continuous samples, screen off, doze, 90 minutes
- [ ] **Beat-to-React-render latency under ~2s** — measured end to end, not watch-to-phone
- [ ] No dropped events across the bridge under doze
- [ ] Timer stays accurate with the app backgrounded and screen off
- [ ] Battery cost per session, watch and phone
- [ ] Which API actually delivers live HR — Data Layer or Health Connect? *[Unverified — spike decides]*
- [ ] Mid-set disconnect behaviour and fallback
- [ ] Optical HR accuracy under grip tension *[Inference — measure it]*

**B. What is the rule?**

- [ ] ⚠️ **Define "recovered."** Absolute BPM? Percentage of session peak? Return toward resting?
      The designs show phone 168 red / 145 yellow / green, watch 168 / 142 / 122 — illustrative
      values in a design file, not a rule. **The gate cannot ship without a threshold rule.**

**Gate:** live BPM rendering in React at acceptable latency, *and* a threshold definition. If the
pipe fails → reconsider all-native. If the rule can't be defined → reconsider the product.

---

## Phase 1 — Definition

- [x] ✅ **Flowchart complete.** All five inferred edges resolved. Two now point at Figma gaps rather than graph gaps
- [x] ✅ **Handoff brief complete**
- [ ] 👤 Commit both exports to `/docs` in the repo

### Data model 🤝

- [ ] Entities: exercises, sets, workouts, plans, mesocycles, HR samples
- [ ] ⚠️ **Progression is per-exercise, not global.** Needs a per-exercise override field with a
      plan-level default
- [ ] ⚠️ **Progression is a strategy enum, not one rule.** Onboarding offers *Steady · Reps First ·
      By Feel* (three cards), while the brief states the default as "hit every rep → +3 reps,
      missed → drop 10%." The Set Workflow screens show weight jumps (135 → 205 → 195), which is a
      different mechanic. **Resolve before schema** — see open decision #11
- [ ] ⚠️ **Pacing is per-exercise too.** Same field, two entry points: Add Exercise Details during
      plan build, and a settings detour off Workout A
- [ ] HR sample strategy — ~5,400 rows/session at 1Hz. Store? Downsample? Sync or local-only?

### Architecture 🤝

- [ ] Local-first vs cloud-first → *recommendation: local-first, gyms have no signal*
- [ ] Auth in v1?
- [ ] Sync conflict strategy
- [ ] Offline behaviour for every write path

---

## Phase 2 — Foundation

### Justin's setup

- [ ] 👤 Node LTS, `npm i -g eas-cli`, `eas login`
- [ ] 👤 Expo account
- [ ] 👤 Supabase project — record URL + anon key
- [ ] 👤 Secrets stored safely, **never committed**
- [ ] 👤 Figma Desktop MCP in Claude Code (OAuth, Pro — verified)
- [ ] 👤 Claude Design MCP: `claude mcp add --scope user --transport http claude-design https://api.anthropic.com/v1/design/mcp`
- [ ] 👤 Verify both with `/mcp` inside a Conductor session
- [ ] 👤 Conductor workspace pointed at the repo
- [ ] 👤 Physical Android device in dev mode (emulators give no real HR)

### Agent setup

- [ ] 🤖 Expo bootstrapped, TypeScript strict
- [ ] 🤖 Folder structure + naming conventions documented
- [ ] 🤖 Lint / format / typecheck / pre-commit
- [ ] 🤖 CI: build + test on PR
- [ ] 🤖 `.env` handling, secret hygiene

### Skills ⚠️ before any parallel agent work

*Blocked on open decision #4 (styling approach).*

- [ ] 🤝 `wolfset-conventions` — structure, naming, state, errors, testing
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

- [ ] 🤖 Type scale — 15 styles, Display XL through Micro
- [ ] 🤖 Spacing, radii, elevation
- [ ] 👤 ⚠️ Decide **Micro @ 8px** — below the ~11px mobile floor, fails under font scaling

### 3b. Code Connect

- [ ] 👤 Figma file renamed first
- [ ] 🤖 `figma-code-connect` skill loaded
- [ ] 🤖 Mappings created (`.figma.ts`)
- [ ] 🤝 Verify agents pull component metadata, not screenshots

### 3c. Components — workout path first

**Exists in Figma** (11): Button (24-variant matrix), Weight (plate stack 2.5–55), Top Bar, Icon Card, Avatar, Chip, Input, Select, Textarea, Switch, Watermark.

**Must be designed and built** — used across screens, not in the library:

- [ ] 🤝 **Timer ring** — the core differentiator UI
- [ ] 🤝 **Numeric keypad** — custom, not OS. Numeric only, **44px minimum targets**. Built because the OS pad's keys are too small for gym use, eats the screen the set row needs, and can't host the ± buttons
- [ ] 🤝 **Set / Exercise row**
- [ ] 🤝 **Card**
- [ ] 🤝 **Stepper (±5)**
- [ ] 🤝 **Segmented progress bar**
- [ ] 🤝 **List item**

Build order: Button → Input → Chip → Top Bar → large numeral → Timer ring → keypad → remainder.

### 3d. UI Kit page

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

**Three known gaps with agreed behaviour and no frames. An agent that fills these from pattern memory produces screens that get thrown away.**

- [ ] **Preset plan review** — picking a preset from Select a Plan drops the user at the *end* of plan build: the whole workout as a summary. Accept takes it as-is; clicking any row opens the same editors a hand-builder would use. Blocked on the plans themselves. First preset is a 5×5
- [ ] **Watch weight adjust** — the watch set screen has two swipe panels. Left is Actions (Skip Set / Change / End) and is drawn. **Up adjusts weight** — Edit Weights' job, watch-sized — and is missing
- [ ] **Editing a live plan** — changing an exercise inside a running mesocycle without starting over. Not drawn, no flowchart edge

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
| 1 | Local-first or cloud-first? | Fable | Phase 2 |
| 2 | Auth in v1? | Justin | Phase 5 |
| 3 | HR sample storage + downsampling | Fable | Phase 1 |
| 4 | ⚠️ Styling — NativeWind vs StyleSheet + tokens | Fable | **Skills, Phase 3** |
| 13 | ~~Expo/RN vs all-native Kotlin?~~ | — | ✅ Expo + one native module. Revisit only on spike evidence |
| 5 | Supported HR devices at launch | Justin | Phase 0 |
| 6 | Micro @ 8px | Justin | Phase 3a |
| 7 | ~~Fidelity verification method~~ | — | ✅ UI Kit page |
| 8 | ~~Figma tokens real Variables?~~ | — | ✅ Yes, namespaced |
| 9 | Separate watch design system? | Justin | Phase 7 |
| 10 | Icon set — `lucide-react-native` sufficient? | Justin | Phase 3c |
| 11 | ⚠️ **Progression: three strategies or one rule?** Onboarding offers *Steady · Reps First · By Feel*; the brief states "+3 reps / −10%"; the screens show weight jumps. Which is default, which are the others, what does *By Feel* compute? | Justin | **Phase 1 schema** |
| 12 | First preset 5×5 — programmed by whom, when? | Justin | Preset gap |

---

## Notes

- **Phase 0 is a gate.** It now has two exit criteria: live BPM *and* a definition of recovered.
- Geom is on Google Fonts and available on the web — the flowchart's note that it isn't (and its
  Barlow fallback) is incorrect. Cosmetic for a flowchart; don't let it propagate into the app.
- Rename the Figma file before Code Connect. Stale names propagate.
