# WOLFSET — Data model

**Status:** reviewed with Justin 2026-08-22 (§6 answered); updated from the 2026-08-31 Figma review (§6b open) · owner: Fable
**Sources:** `docs/design/handoff-brief.html` §01–§04, `docs/design/flowchart.html`,
`docs/design/flows-v2.html`, decisions #1, #3, #11 in `decisions.md`, and Figma **Add Exercise
Details** (`Wolfset` file `1RsF6PeYzGxdTso4FZDAbp`, node `123:1092`) for the prescription fields.

This is the shape of what the app stores, written to be read before any code exists. Every
entity below answers to a screen in the flowchart; nothing is invented. Where something is a
proposal rather than a settled rule it is marked **[proposed]**.

---

## 0. Ground rules (from decisions already made)

- **Local-first (#1).** The on-device SQLite database is the truth. Every table has `id`
  (UUID generated on the phone), `createdAt`, `updatedAt`, and `deletedAt` (soft delete) so
  records can sync later (Phase 6) without renumbering anything.
- **Progression is a strategy enum, per exercise, with a plan default (#11).**
- **Pacing (rest) is per exercise, with a plan default** (brief §02).
- **Units:** weights are stored *as entered* with their unit (`lb` | `kg`). Plate math and
  increments are unit-native (5 lb ≠ 2.27 kg), so converting on the way in would round badly.
  Converting for display only happens if the user flips the toggle later. **[proposed]**
- **Rounding is always to the nearest loadable weight** (Justin, 2026-08-22) — never to a
  tidy number. What is loadable depends on the equipment: a barbell with 2.5 lb plates moves in
  5 lb steps (a plate each side); a dumbbell rack moves in 2.5 or 5 lb steps depending on the
  gym. So the smallest step is a setting, per load type, eventually asked in onboarding.

## 1. The words, fixed

| Word | Means | Example |
|---|---|---|
| **Exercise** | A movement from the catalog | Bulgarian Split Squat |
| **Plan** | A template: days, each with exercises and their prescriptions | "Winter Bulk" |
| **Mesocycle** | One run through a plan, progressing until it ends | Winter Bulk, run #2 |
| **Workout** | One session, either a plan day or freestyle | "Workout A", Tue |
| **Set** | One logged performance of an exercise in a workout | 135 lb × 5 |
| **Prescription** | What the plan says to do for an exercise: sets, reps, weight, rest | 5 × 5 @ 135, 1:30 rest |
| **Failure** | A workout the user *did* where an exercise did not hit its target | 4 of 5 sets hit |
| **Miss** | A scheduled workout the user *did not do* | skipped Tuesday |

Failure and miss are different things and drive different rules (§5). The watch copy "This will
count as a miss and may trigger a deload" needs to say *failure* — ending a workout early is an
attempt that fell short, not a skipped day. ⚠️ **Screen copy to fix in Figma.**

## 2. Entities

### Profile — one row

From Onboarding (all four screens skippable → every field nullable).

| Field | Type | From |
|---|---|---|
| `unit` | `lb` \| `kg` | Setup toggle (default `lb`) |
| `experience` | `beginner` \| `intermediate` \| `advanced` \| null | Setup |
| `equipment` | set of `dumbbells` · `barbells` · `machines` · `treadmills` · `kettlebells` · `pull-up-bars` · `exercise-bikes` · `medicine-balls` | Settings → Equipment (`433:22674`) is a checklist, so the onboarding's three-way enum (`full-gym` / `some-weights` / `body-weight`) became a set (2026-09-04); onboarding should map onto it |
| `goal` | `muscle` \| `strength` \| `endurance` \| `vibing` \| null | Goals; Settings → Goal adds **Vibing** ("no specific goal"). "Not sure yet" = null |
| `smallestStepBarbell` + unit | number, default **5 lb** | the gym's smallest barbell jump (2.5 lb plates each side). Future onboarding question |
| `smallestStepDumbbell` + unit | number, default **5 lb** | dumbbell racks differ by gym: 2.5 or 5 lb |
| `bodyweight` + unit, `height` | number \| null | Settings → Personal Settings (2026-08-31); bodyweight trend feeds Exercise Data |
| `absenceDeloadWorkouts` | int, default **2** | designed (`359:1470`): "You have missed 2 workouts" — counted in missed workouts, not days. See §5.4 |
| `absenceDeloadPercent` | int, default **10** | same screen: "Deload all exercises by 10%" |

Auth identity (email, Google) is Supabase's concern in Phase 6 and is not modelled here (#2).

### Exercise — the catalog

| Field | Type | Notes |
|---|---|---|
| `name` | text | "Bulgarian Split Squat" |
| `description` | text | Add Exercise screen |
| `demoMediaRef` | text \| null | the demo frame on Add Exercise |
| `equipment` | enum as Profile | lets the catalog filter by what the user has |
| `loadType` | `barbell` \| `dumbbell` \| `machine` \| `bodyweight` \| `kettlebell` \| `cable` *(six — the filter drawer `403:13713`)* | the first chip on Add Exercise Details ("Dumbell"); decides which smallest-step applies when rounding (§5.2) and whether weight is **per hand** |
| `muscleGroups` | text[] | second chip: "Quads • Glutes" |
| `isUnilateral` | bool | third chip: "Unilateral" |
| `isCustom` | bool | seeded catalog rows are `false`; user-added are `true` |

Seeded once on first launch; users can add to it. Search Exercise reads this table.

### Plan — the template

| Field | Type | Notes |
|---|---|---|
| `name` | text | "Winter Bulk" (Name this Plan) |
| `progressionDefault` | `ProgressionRule` (§3) | "How You Get Stronger" — the three cards |
| `pacingDefault` | `PacingRule` (§3) | rest seconds, auto-start timer |
| `deloadDefault` | `DeloadRule` (§3) | drop 10% after 2 failures |
| `source` | `built` \| `preset` \| `from-freestyle` | Build My Own / Select a Plan / Session Done → New Meso from a freestyle |

### PlanDay — "Day 1", "Workout A"

| Field | Type |
|---|---|
| `planId` | → Plan |
| `order` | int |
| `name` | text |

### PlanExercise — the prescription

One row per exercise on a day. This is where **per-exercise overrides** live; `null` means
"inherit the plan default".

| Field | Type | Notes |
|---|---|---|
| `planDayId` | → PlanDay | |
| `exerciseId` | → Exercise | |
| `order` | int | |
| `sets` | int | Add Exercise Details: 1 · 3 · 5 · 10 · custom |
| `reps` | int | "Starting Reps": 5 · 8 · 10 · 12 · custom |
| `repCeiling` | int \| null | "Max Reps before Weight Increase": 12 · 16 · 18 · 20 · custom. `null` = plan default (**20**). Only used by `reps-first` |
| `startWeight` + `unit` | number, `lb`\|`kg` | the 85. **Per hand** when the exercise is a dumbbell lift ("Weight • Per Hand") — stored as the per-hand number, never doubled |
| `increment` | number \| null | **5 lb default**, override per exercise ("less for specific lifts"). Also drives the screen's "We suggest 85" = last workout's 80 + 5 |
| `progression` | `ProgressionRule` \| null | Progression Override screen; the "override applied" badge = not null |
| `pacing` | `PacingRule` \| null | Pacing Override |
| `deload` | `DeloadRule` \| null | per-exercise deload ("some lifts need more or less") |

### Mesocycle — one run of a plan

| Field | Type | Notes |
|---|---|---|
| `planId` | → Plan | |
| `strategy` | `steady` \| `reps-first` \| `by-feel` | copied from the plan default at start — a meso is *typed* by its strategy (#11) |
| `startedAt` | timestamp | |
| `endedAt` | timestamp \| null | null = the current meso |
| `endReason` | `plateau` \| `user-ended` \| `replaced` \| null | Session Done → New Meso, or the plateau prompt (§5.2) |
| `nextPlanDayId` | → PlanDay | what "Workout A" shows next; advances after each finished workout |
| `plannedWeeks` | int | "Plan A • Week 3 of 5" on Workout A (Figma `34:778`). Current week is derived from `startedAt` |

Only one mesocycle is open at a time. Starting a new one closes the current with `replaced`.

### ExerciseProgress — the live numbers per exercise in the current meso

This is the table the progression rules read and write. One row per (mesocycle, planExercise).

| Field | Type | Notes |
|---|---|---|
| `mesocycleId` | → Mesocycle | |
| `planExerciseId` | → PlanExercise | |
| `currentWeight` + `unit` | number | what Log a Set pre-fills |
| `currentReps` | int | the target; moves in `reps-first` |
| `consecutiveFailures` | int | reset to 0 on a hit; **2 → plateau prompt** |
| `lastOutcome` | `hit` \| `failed` \| null | |
| `lastWorkoutAt` | timestamp \| null | feeds the absence deload (§5.4) |

### Workout — one session

| Field | Type | Notes |
|---|---|---|
| `kind` | `plan` \| `freestyle` | decides the Workout Summary title |
| `mesocycleId` | → Mesocycle \| null | null for freestyle |
| `planDayId` | → PlanDay \| null | null for freestyle |
| `startedAt`, `endedAt` | timestamp | |
| `status` | `in-progress` \| `finished` \| `ended-early` | End Workout? on the watch = `ended-early` |
| `durationSec`, `totalVolume`, `avgBpm`, `exerciseCount` | cached numbers | Session Done: 38:42 · 4,180 lb · 124 bpm · 3 |

### WorkoutExercise — an exercise inside a session

| Field | Type | Notes |
|---|---|---|
| `workoutId` | → Workout | |
| `exerciseId` | → Exercise | |
| `order` | int | |
| `prescribed` | `{ sets, reps, weight, unit }` \| null | **snapshot** of the prescription at the time, so history stays true after the plan changes. null for freestyle (sets are open-ended) |
| `outcome` | `hit` \| `failed` \| `skipped` \| null | computed when the workout finishes (§5.1) |

### WorkoutSet — the atom

| Field | Type | Notes |
|---|---|---|
| `workoutExerciseId` | → WorkoutExercise | |
| `index` | int | the pip on the rail |
| `weight` + `unit` | number | what was actually lifted (Edit Weights changes this *and* `ExerciseProgress.currentWeight` — "applies to future sets and workouts") |
| `reps` | int | "tap the number to decrease reps" |
| `loggedAt` | timestamp | |
| `restStartedAt`, `restEndedAt` | timestamp \| null | the Post Set Timer window |
| `restEndReason` | `timer` \| `continue` \| `recovered` \| null | which exit from the timer (brief §01: two triggers, one destination — but we record which) |
| `bpmAtLog`, `bpmAtRestEnd` | int \| null | the two numbers the gate cares about |

### HrSample — the stream (decision #3)

| Field | Type |
|---|---|
| `workoutId` | → Workout |
| `at` | timestamp |
| `bpm` | int |
| `accuracy` | `high` \| `medium` \| `low` |
| `sequence` | int — the watch's sequence number; samples can arrive out of order (spike finding) |

**Storage rule [proposed]:** store every sample locally as it arrives — ~2,800 rows per 90-minute
session at the measured 1.92 s cadence, about 50 KB, trivial. Keep raw samples for **30 days**,
then delete; never sync raw samples in v1. What the product actually needs long-term is the
**per-rest recovery curve**, which is derived and small:

### RestRecovery — derived, one row per rest period

| Field | Type | Notes |
|---|---|---|
| `workoutSetId` | → WorkoutSet | |
| `startBpm`, `endBpm` | int | |
| `secondsToRecovered` | int \| null | null if the user hit Continue before recovering |
| `peakBpm` | int | |

This is the row that will eventually answer "what does recovered mean for *this* user"
(Phase 0 criterion B) and it survives the 30-day raw purge.

### FeelRating — the By Feel poke, one row per rated exercise ✨ (2026-08-31)

| Field | Type | Notes |
|---|---|---|
| `workoutExerciseId` | → WorkoutExercise | |
| `reserve` | `0` \| `1` \| `2` \| `3` \| `4plus` | the y axis: reps left in the tank |
| `form` | `clean` \| `bad` | the x axis |
| `loggedAt` | timestamp | |

No row = not rated (the grid auto-skips after 8 s). The engine only ever reads the **previous
session's** rating (its "Sources" panel), so no aggregate table is needed.

## 3. Rule types (stored as JSON columns)

```ts
type ProgressionRule =
  | { strategy: 'steady' }                            // weight climbs by `increment` on a hit
  | { strategy: 'reps-first'; repStep: number }      // reps climb by repStep (3 on the Progression Override
                                                      // screen) on a hit, until PlanExercise.repCeiling
                                                      // ("Max Reps before Weight Increase"), then weight
                                                      // climbs by `increment` and reps reset to the start
  | { strategy: 'by-feel' };                          // nothing automatic; app shows last + suggestion

type PacingRule = { restSeconds: number; autoStartTimer: boolean };   // 90, true

type DeloadRule = { percent: number; afterFailures: number };         // 10, 2
```

The Progression Override screen currently reads *"When I hit every rep, add +3 reps to the next
session. Missed → drop 10%."* In this model that is `reps-first` with `repStep: 3` plus the
shared deload — not the `steady` default. ⚠️ **Screen copy should reflect the strategy chosen on
"How You Get Stronger".**

## 4. How the screens map

| Screen | Reads | Writes |
|---|---|---|
| Workout A (home) | Mesocycle.nextPlanDay → PlanExercises + ExerciseProgress | — |
| Log a Set | ExerciseProgress.currentWeight/currentReps | WorkoutSet |
| Edit Weights | WorkoutSet.weight | WorkoutSet.weight **and** ExerciseProgress.currentWeight |
| Post Set Timer | HrSample stream, PacingRule | WorkoutSet.rest*, RestRecovery |
| Workout Summary | WorkoutExercises + Sets for the open Workout | — |
| Edit Set | WorkoutSet | WorkoutSet |
| Session Done | Workout cached numbers | Workout.status/endedAt; outcomes (§5.1); ExerciseProgress (§5.2) |
| Session Done → Add to Plan *(freestyle)* | Workout | a **new PlanDay** on the current plan, with the session's exercises as PlanExercises |
| Session Done → New Meso *(freestyle)* | Workout | **double confirmation**, then: close the current Mesocycle (`replaced`), new Plan (`from-freestyle`) with this session as Day 1, new Mesocycle |
| Getting Started | — | Plan, PlanDays, PlanExercises, Mesocycle |
| Change It Up | Plans, Mesocycle | Mesocycle.nextPlanDayId |

## 5. The rules, in order of when they run

### 5.1 When a workout finishes — score each exercise

For each WorkoutExercise with a prescription: **hit** if every prescribed set was logged with
`reps ≥ target`; otherwise **failed**; **skipped** if no sets were logged. Freestyle exercises
are never scored. A workout **ended early** is scored the same way — every exercise not fully
done is a failure that counts toward the plateau streak (Justin, confirmed 2026-08-22).

### 5.2 Then — progress each exercise (strategy from the Mesocycle)

| Strategy | On **hit** | On **failed** |
|---|---|---|
| `steady` | `currentWeight += increment`; failures = 0 | failures += 1 |
| `reps-first` | `currentReps += repStep`; if `> repCeiling` (user-chosen: 12/16/18/20/custom, default 20) → weight += increment, reps = prescription.reps; failures = 0 | failures += 1 |
| `by-feel` | the Calculation Engine (§5.6) | the Calculation Engine (§5.6) |

When `consecutiveFailures` reaches `deload.afterFailures` (default 2) the app **asks, never
decides** (Justin, 2026-08-22): *"Two sessions in a row below target on Squat. Deload 10%, or end
this mesocycle and start fresh?"* — Deload applies `currentWeight *= (1 − percent/100)` **rounded to the nearest loadable weight**
for the exercise's `loadType` (135 × 0.9 = 121.5 → 120 on a 5 lb-step barbell, 122.5 with
2.5 lb steps) and resets failures; End closes the Mesocycle with `plateau`. ⚠️ **This prompt
is not designed** — it belongs on the Session Done screen or the next Workout A. Stop and ask.

### 5.3 Misses — nothing automatic in v1

A miss (scheduled day not done) is not stored as a row; it is derived from the gap between
`ExerciseProgress.lastWorkoutAt` and now. v1 does not penalise misses.

### 5.4 Absence deload — designed (`359:1470`, 2026-08-31)

Workout A shows a card: *"You have missed 2 workouts — Deload all exercises by 10%"*, Decline /
Accept. Accept applies the deload to **every** exercise in the plan (each rounded to its own
loadable step) and clears failure streaks; Decline dismisses. The trigger counts **missed
workouts**, which means the plan knows its weekly schedule — the day chips on "Name this Plan"
→ `Plan.scheduledDays` (weekday set) **[proposed]**; a workout is missed when a scheduled day
passes with no session.

### 5.6 By Feel — the Calculation Engine (Figma `384:11049`, 2026-08-31) ✨

Runs when a By Feel exercise finishes, from three sources: the set log (never asked), this
session's `FeelRating` (the poke), and the previous session's rating.

1. **Poke → steps:** all reps hit · plenty left · clean → **2** · all reps · 1–2 left · clean →
   **1** · anything else (nothing left, form broke, missed reps, not rated) → **0** (hold).
2. **Range picks the lever:** below `repRangeMax` → `currentReps += steps` (capped at the top);
   at the top → `currentWeight += increment`, reps reset to `repRangeMin`. Engine note
   *"+5 upper, +10 lower"* — ⚠️ 👤 confirm: increment default by body region?
3. **Past-session rules:** bad form or two consecutive missed-rep sessions → **deload 10%** ·
   bad form while plenty left → hold · held at the top of the range two sessions → add weight ·
   unrated two sessions → **offer** switching the exercise to Steady (ask, don't switch).

Implemented in `mobile/src/features/progression/by-feel.ts` (tested; the engine table above is
the test list). The engine's deload (bad form while grinding, or two missed sessions) is a
**prompt**, not an automatic action — Justin, 2026-08-31: *"We always want to ask before we do
things for the user."* Accept runs `applyDeload`.

### 5.5 The gate (Phase 0 criterion B) — still undefined

`RestRecovery` collects the curves; the rule that turns `bpm` into *recovered* is not in this
document because it is not decided. The model does not need it to be — it only needs to record
what happened.

## 6. Questions asked and answered (2026-08-22)

1. **Reps-first ceiling** — the *"Max Reps before Weight Increase"* button group on Add
   Exercise Details (Figma node `123:1092`): 12 · 16 · 18 · 20 · custom. Per exercise, picked at
   setup; **default 20**. Lives on `PlanExercise.repCeiling`, not inside the rule, because the
   screen sets it next to sets and reps.
2. **Deload rounding** — **nearest loadable weight**, always. Depends on load type and the gym's
   plates/dumbbell increments → `Profile.smallestStep*` + `Exercise.loadType`. A future
   onboarding question.
3. **Freestyle → plan** — two secondary buttons on Session Done: **Add to current plan as a new
   day**, or **start a new mesocycle with this as Day 1**. The second ends the current plan, so
   it gets a **double confirmation**. Either can be edited to add more later.
4. **Ended early** — confirmed: unfinished exercises are failures and count toward a deload.

## 6b. New questions from the 2026-08-31 review

1. **"+5 upper, +10 lower"** in the By Feel engine — upper-body vs lower-body default
   increments? If so the Exercise needs a body-region flag (derivable from `muscleGroups`?).
2. **Exercise Data export** — what format (CSV? share sheet?)?
3. **By Feel Add Exercise Details** (`380:10087`) shows single-value Reps buttons and a
   "Reps first" progression label — how does the user set the 5–8 *range*?
4. **Absence deload** counts missed workouts → needs `Plan.scheduledDays` (or equivalent).
   Modelled as the day chips; confirm.

## 7. What this does **not** decide

- Storage engine — `expo-sqlite` is the candidate; chosen when the first repository is written.
- Sync shape, conflict rules, auth — Phase 6 (#2).
- Watch-side storage — the watch holds only the live session and forwards; the phone is truth.
