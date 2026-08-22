# WOLFSET — Data model

**Status:** draft for Justin's review · 2026-08-22 · owner: Fable
**Sources:** `docs/design/handoff-brief.html` §01–§04, `docs/design/flowchart.html`,
`docs/design/flows-v2.html`, decisions #1, #3, #11 in `decisions.md`.

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
| `equipment` | `full-gym` \| `some-weights` \| `body-weight` \| null | Equipment |
| `goal` | `muscle` \| `strength` \| `endurance` \| null | Goals ("Not sure yet" = null) |
| `absenceDeloadDays` | int, default **14 [proposed]** | Not designed yet — see §5.4 |
| `absenceDeloadPercent` | int, default **10 [proposed]** | same |

Auth identity (email, Google) is Supabase's concern in Phase 6 and is not modelled here (#2).

### Exercise — the catalog

| Field | Type | Notes |
|---|---|---|
| `name` | text | "Bulgarian Split Squat" |
| `description` | text | Add Exercise screen |
| `demoMediaRef` | text \| null | the demo frame on Add Exercise |
| `equipment` | enum as Profile | lets the catalog filter by what the user has |
| `isCustom` | bool | seeded catalog rows are `false`; user-added are `true` |

Seeded once on first launch; users can add to it. Search Exercise reads this table.

### Plan — the template

| Field | Type | Notes |
|---|---|---|
| `name` | text | "Winter Bulk" (Name this Plan) |
| `progressionDefault` | `ProgressionRule` (§3) | "How You Get Stronger" — the three cards |
| `pacingDefault` | `PacingRule` (§3) | rest seconds, auto-start timer |
| `deloadDefault` | `DeloadRule` (§3) | drop 10% after 2 failures |
| `source` | `built` \| `preset` \| `from-freestyle` | Build My Own / Select a Plan / Session Done → Add to Plan |

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
| `sets` | int | Add Exercise Details |
| `reps` | int | target reps per set |
| `startWeight` + `unit` | number, `lb`\|`kg` | the 85 on Add Exercise Details |
| `increment` | number \| null | **5 lb default**, override per exercise ("less for specific lifts") |
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

## 3. Rule types (stored as JSON columns)

```ts
type ProgressionRule =
  | { strategy: 'steady' }                            // weight climbs by `increment` on a hit
  | { strategy: 'reps-first'; repStep: number;       // reps climb by repStep on a hit…
      repCeiling: number }                            // …until repCeiling, then weight climbs and reps reset
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
| Session Done → Add to Plan | Workout (freestyle) | Plan.source = `from-freestyle`, PlanDay, PlanExercises |
| Getting Started | — | Plan, PlanDays, PlanExercises, Mesocycle |
| Change It Up | Plans, Mesocycle | Mesocycle.nextPlanDayId |

## 5. The rules, in order of when they run

### 5.1 When a workout finishes — score each exercise

For each WorkoutExercise with a prescription: **hit** if every prescribed set was logged with
`reps ≥ target`; otherwise **failed**; **skipped** if no sets were logged. Freestyle exercises
are never scored.

### 5.2 Then — progress each exercise (strategy from the Mesocycle)

| Strategy | On **hit** | On **failed** |
|---|---|---|
| `steady` | `currentWeight += increment`; failures = 0 | failures += 1 |
| `reps-first` | `currentReps += repStep`; if `> repCeiling` → weight += increment, reps = prescription.reps; failures = 0 | failures += 1 |
| `by-feel` | nothing automatic | nothing automatic |

When `consecutiveFailures` reaches `deload.afterFailures` (default 2) the app **asks, never
decides** (Justin, 2026-08-22): *"Two sessions in a row below target on Squat. Deload 10%, or end
this mesocycle and start fresh?"* — Deload applies `currentWeight *= (1 − percent/100)` rounded to
the plate increment and resets failures; End closes the Mesocycle with `plateau`. ⚠️ **This prompt
is not designed** — it belongs on the Session Done screen or the next Workout A. Stop and ask.

### 5.3 Misses — nothing automatic in v1

A miss (scheduled day not done) is not stored as a row; it is derived from the gap between
`ExerciseProgress.lastWorkoutAt` and now. v1 does not penalise misses.

### 5.4 Absence deload — not designed yet, not blocking MVP

Justin's rule: if the user returns after too long away, Workout A offers a deload. Data needed is
already in the model — `Profile.absenceDeloadDays/Percent` and `ExerciseProgress.lastWorkoutAt`.
Trigger **[proposed]**: `now − max(lastWorkoutAt) > absenceDeloadDays`. Justin designs the screen;
the settings surface for it comes later.

### 5.5 The gate (Phase 0 criterion B) — still undefined

`RestRecovery` collects the curves; the rule that turns `bpm` into *recovered* is not in this
document because it is not decided. The model does not need it to be — it only needs to record
what happened.

## 6. Open questions for Justin

1. **Reps-first numbers:** `repStep` 3 (from the screen) and `repCeiling` — what's the ceiling
   before weight steps up? (e.g. 5 → 8, then +5 lb and back to 5)
2. **Deload rounding:** 10% of 135 is 121.5. Round to the nearest 5 lb (120) or nearest plate
   (2.5 → 122.5)?
3. **Freestyle → Add to Plan:** does the freestyle session become a *new day* on an existing
   plan, or merge into an existing day? The brief says "add this workout to an existing
   mesocycle" — modelled as a new PlanDay for now.
4. **`ended-early` workouts:** scored as failures for any exercise not fully done (matches your
   "failure, not miss"). Confirm.

## 7. What this does **not** decide

- Storage engine — `expo-sqlite` is the candidate; chosen when the first repository is written.
- Sync shape, conflict rules, auth — Phase 6 (#2).
- Watch-side storage — the watch holds only the live session and forwards; the phone is truth.
