# Figma inventory — `Wolfset` (file `1RsF6PeYzGxdTso4FZDAbp`)

**Crawled 2026-08-22, re-crawled 2026-08-31** from the page at node `6:10` via the Figma MCP
(`get_metadata`), not by hand. Every node ID below is real and can be opened as
`https://www.figma.com/design/1RsF6PeYzGxdTso4FZDAbp/Wolfset?node-id=<id with - instead of :>`.

**Why this file exists:** Figma is the source of truth for everything visual — screens, tokens,
spacing. Agents must build from the exact node, never from memory. This is the lookup table.
Re-crawl when Justin says the file changed; the crawl date above is the freshness signal.

> Figma is king for visuals. The flowchart (`docs/design/flowchart.html`) is king for edges and
> rules. When a frame here and the flowchart disagree on *behaviour*, the flowchart wins; on
> *appearance*, Figma wins.

---

## 1. Mobile Design System — section `293:1647` *(renamed from "Design System")*

### Colors — section `20:30`

Documentation swatches only. **Do not read values from here** — the Variables are the tokens
(`get_variable_defs` on `293:1647`). This page numbers neutrals `50…950`; the Variables use
`50…900`. The Variables win (standing rule in `CLAUDE.md`).

| Scale frame | ID |
|---|---|
| Red | `21:14` |
| Yellow | `21:81` |
| Green | `21:137` |
| Neutral | `23:14` |
| Blue | `30:94` |

### Typography Scale — frame `51:279`

| Style | ID | Spec (from the frame label) |
|---|---|---|
| Display XL | `51:282` | Geom Black 128 / 100% |
| Display L | `51:285` | Geom Black 96 / 108px |
| H1 | `51:288` | Geom Black 48 / 100% |
| H2 | `51:291` | Geom SemiBold 36 / auto |
| H3 | `51:294` | Geom Medium 28 / auto |
| H3 Bold | `51:297` | Geom Bold 28 / auto |
| Title | `51:300` | Geom Black 20 / 100% |
| Title Value | `51:303` | Geom ExtraBold 20 / 100% |
| Button | `51:306` | Geom SemiBold 20 / 24px |
| Body | `51:309` | Geom Regular 16 / auto |
| Body Light | `51:312` | Geom Light 16 / 24px |
| Label | `51:315` | Geom SemiBold 16 / 100% |
| Caption | `51:318` | Geom Medium 12 / 100% |
| Micro | `68:251` | Geom Bold 8 / 8px — ⚠️ open decision #6 |

✅ **All 14 type styles are Variables as of 2026-08-31** (plus `font-size/*` and `line-height/*`
primitives). Tokens can now be exported, not transcribed — Phase 3a is unblocked.

### Components — section `25:250`

| Component | Container | Variant axes | Count | Notes |
|---|---|---|---|---|
| **Button** | `20:91` | Size (Large 335×64 / Small 281×48) × Style (Solid / Outline / Ghost / Secondary) × State (Default / Pressed / Disabled) | 24 | complete matrix |
| **Weight** (plate) | `27:540` | Property 1 = 55 / 45 / 35 / 25 / 10 / 5 / 2.5 | 7 | plate stack pieces, heights encode size |
| **Top Bar** | `34:1392` | Default / Left-Aligned | 2 | 412×92 |
| **Icon Card** | `34:1590` | Quick Action × Default / Pressed | 2 | 170×140 — the hub tiles |
| **Avatar** | `48:429` | Initials / Picture / Illustration | 3 | 40×40 |
| **Chip** | `48:579` | Style (Brand / Muted / Outline) × Size (Small 34×16 / Large 66×36) × Pressed | 12 | |
| **Input** | `74:519` | Text × Default / Filled / Error | 3 | 516×96 |
| **Select** | `74:520` | Text × Default / Filled / Error | 3 | 516×96 |
| **Textarea** | `78:611` | Text × Default / Filled / Error | 3 | 516×124–128 |
| **Switch** | `123:2433` | True / False × Default / Disabled | 4 | 48×24 |
| **Watermark / Slashes** | `235:1818` | — | 1 | 500×500 |
| **Card** | `359:1597` | Default `359:1570` / Outline `359:1596` | 2 | |
| **Radio Card** | `359:1726` | Default `359:1725` / Selected `359:1724` | 2 | the onboarding / "How You Get Stronger" cards |
| **Button Group** ✨ | `373:7703` | State=True `373:7654` / False `373:7655` | 2 | the 1 · 3 · 5 · 10 · ✎ rows — componentised 2026-08-31 |
| **Checkbox** ✨ | — | Default `433:23133` / Filled `433:23132` / Indeterminate `433:23198` | 3 | 32×32 — Dumbbell Scale, filters |
| **Icon** ✨ | `436:4844` "WolfSet Icons" | Category (Exercise / Filter / Muscle) × Type | 22 | custom red icon set: 10 exercises, 6 equipment filters, 6 muscle groups. Bears on open decision #10 |
| **Bottom Drawer** ✨ | `403:13713` | — | 1 | "Filters" drawer with `Handle` `403:13714`; a new pattern — drag-handle sheet |
| **Select/List Item** | `114:2626` (lives in Web App, not here) | — | 1 | 412×80 — the Search Exercise row (renamed from "List Item"). 👤 move into Components |

Not yet in the library but used on screens (plan §3c): Timer ring, Numeric keypad, Set/Exercise
row, Stepper (±5), Segmented progress bar (now visible on the mid-set Workout A: "7 of 26 sets
logged"), the 2D **By Feel poke grid**, and the stat tiles / line charts on Exercise Data.

### Brand — section `188:5218`

Logo `210:18888`: Mark `188:5222` (256²) · Stacked `203:8457` · Row `203:8456` · Vertical `203:8455`.

---

## 2. Web App — section `263:1903` · 412-wide phone frames

Grouped by the flowchart's phases. *Duplicates* are the same screen drawn in more than one
journey — build once (brief §03).

### Account

| Flowchart screen | Frame | ID | Notes |
|---|---|---|---|
| Splash | Login Flow | `188:5452` | also 8 explorations in *App Name Explorations* `242:1902` — ignore those |
| Login | Login | `188:4817`, `210:18604` | duplicate |
| Failed Login | Failed Login | `188:7672` | state of Login |
| Create Account | Create Account | `188:7752` | |
| Reset Password | Reset Password | `210:18783` | |
| Check Your Email | Check Email / Resend | `210:18889` / `210:18927` | cooldown + resend state |
| Confirm Your Email | Confirm Email / Timer / Resend | `210:18398` / `210:18487` / `210:18540` | same component as Check Email — one build, four uses |
| New Password | New Password | `210:18968` | |

### Onboarding

| Flowchart screen | Frame | ID |
|---|---|---|
| Setup (units + experience) | Onboarding / Preferences | `188:7819` |
| Equipment | Onboarding / Equipment | `217:1403` |
| Goals | Onboarding / Equipment | `217:1465` |
| Select a Plan (scrolls, 412×1467) | Onboarding / Equipment | `224:1604` |

### Plan build (Getting Started)

| Flowchart screen | Frame | ID | Notes |
|---|---|---|---|
| Get Started / Change It Up hub | Home Hub - Change it up | `34:1464`, `70:281`, `101:637` (412×1120), `93:668` | four drawings of the hub |
| Name this Plan | New Plan | `114:3014` | |
| How You Get Stronger | New Plan / Reps First | `101:994` | three Radio Cards (IDs corrected 2026-09-02 — they were swapped) |
| What's the first lift? | Search Exercise | `70:339`, `101:814` | shared with Freestyle |
| Add Exercise | Add Exercise | `48:463` | |
| **Add Exercise Details** | Add Exercise Details | **`123:1092`** (412×1214) | sets / starting reps / max reps before weight increase / progression / pacing — see `data-model.md` |
| Override Applied | Add Exercise Details / Override Applied | `123:1654` | |
| Progression Override | Progression Override | `114:3989` (412×1080), `123:2105` (412×949) | two drawings |
| Day Summary | Day Summary | `123:1944` | |
| Plan Summary | Plan Summary | `123:2530` | |

### Plan build — strategy-specific rows ✨ (added by 2026-08-31)

Plan build is now drawn **once per strategy**; the shared screens differ only where the strategy
does. "How You Get Stronger" now leads into the matching row.

| Screen | Steady | Reps First | By Feel |
|---|---|---|---|
| New Plan (strategy card selected) | `380:8548` | `101:994` | `380:9747` |
| Search Exercise | `380:8631` | *(shared)* | `380:9821` |
| Add Exercise Details | `380:8897`, `380:9471` | `123:1092` | `380:10087` |
| Progression Override | `380:9118` | `123:2105`, `114:3989` | `380:10278` |
| Pacing Override | `380:9352` | `384:11190` | *(shared)* |

⚠️ Copy bugs spotted on `380:10087` (By Feel AED): the Sets button group reads **1 · 3 · 3 · 10**
(duplicate 3, presumably 5), and the Progression row reads *"Reps first • Plan Default"* inside
the By Feel flow. 👤 confirm/fix.

### By Feel Calculation Engine ✨ — section `384:11049`

The rules for what *By Feel* computes, drawn as a spec (Step 1 `384:10858`, Step 2 `384:10983`,
Sources `384:10936`, Rules `384:11037`). Summary — the source of truth is the section itself:

- After an exercise finishes, the user pokes a 2D grid (screens `380:10489`, `384:10881`
  "How was it?"): **x = form** (Clean ↔ Bad Form), **y = reps left in reserve** (Nothing Left
  0 · 1 · 2 · 3 · 4+ Plenty Left). Skips after 8 s; a skip repeats the progression.
- **Step 1 — poke → steps:** All reps · Plenty left · Clean → **2 steps** · All reps · 1–2 left ·
  Clean → **1 step** · everything else (nothing left / form broke / missed reps / not rated) →
  **Hold**.
- **Step 2 — the rep range picks the lever** (default range **5–8**, per-exercise): below the
  top of the range → **+1 rep per step**; at the top → **+weight, reps reset**. Increment note:
  *"+5 upper, +10 lower"* — 👤 confirm this means upper-body vs lower-body lifts.
- **From past sessions** (only ever the previous one): bad form or missed two sessions →
  **deload 10%** · bad form at plenty left → hold · held at top of range two sessions → **add
  weight** · no rating two sessions → **offer switch to "Steady"**. *(typo in the frame: "Helt")*

### The session, mid-set ✨

Workout A is also the live in-session hub — three progress states of the same screen:

| State | ID |
|---|---|
| Set 2 not started | `384:11481` |
| Set 2 started (current-set pips, "7 of 26 sets logged" bar) | `433:22215` |
| More than 4 sets | `433:22351` |
| Log a Set (updated) | `380:10713`, `384:11460` |
| Search Exercise (updated) + filter drawer | `384:11596`, `403:13713` |

### Settings ✨ — change onboarding answers later

| Screen | ID | Notes |
|---|---|---|
| Settings home | `433:22471` | Equipment · Unit & Scale · Exercise Data · Personal Settings · Workout Goal |
| Equipment | `433:22674` | |
| Dumbbell Scale | `433:22844` | unit toggle + increment choice **5 lb** (10/15/20/25/30) or **2.5 lb** (10/12.5/…), "Impacts progression increases" — this is `Profile.smallestStepDumbbell` |
| Exercise Data | `433:23207` | stat tiles (workouts, mesocycles, total gain, joined), bodyweight trend, per-exercise progress charts, **export** (top-right). ⚠️ header copy is stale: "Settings • Dumbbell scale" |
| Goal | `433:27536` | Build Muscle · Build Strength · Endurance · **Vibing** ("no specific goal") — a 4th goal option |
| Home Hub (updated) | `433:23386` | |

### Onboarding addition ✨

| Screen | ID | Notes |
|---|---|---|
| Unit & Scale | `443:5086` | same content as Settings → Dumbbell Scale, with Skip/Next — the smallest-step onboarding question, now designed |

### Train — the shared engine

| Flowchart screen | Frame | ID | Notes |
|---|---|---|---|
| **Workout A** (home) | Workout Summary | `34:778` | "Plan A • Week 3 of 5" — a meso has a planned week count |
| Workout A — absence deload ✅ | Workout Summary - Deload Suggestion | `359:1470` | "You have missed 2 workouts — **Deload all exercises by 10%**", Decline / Accept. The absence deload, designed: trigger is **2 missed workouts**, scope is **all exercises** |
| Log a Set | Log a Set | `25:388`, `90:1256` | duplicate |
| Edit Weights +5 | Edit Weights / Add More | `34:695`, `90:1169` | |
| Edit Weights −5 | Edit Weights / Reduce | `34:1236` | |
| Edit Weights keypad | Edit Weights / Custom | `34:960` | |
| Post Set Timer — red | Timer – High heart Rate | `25:292` | |
| Post Set Timer — yellow | Timer – Medium Heart | `10:10447` | |
| Post Set Timer — green | Android Compact - 2 / - 3 | `25:257`, `90:1379` | ⚠️ default names — 👤 rename |
| Workout Summary (running list) | Workout Summary | `90:1304`, `93:581` | titled Freestyle / Workout A |
| Edit Set | Edit Set | `93:527` | |
| Session Done | *(in the Workout Summary frames above)* | — | two exits: Add to Plan / New Meso |

### Journey labels

`User Journey` frames (`90:1369`, `101:666`, `101:811`, `123:2850`, `210:18395`, `210:18654`,
`188:7816`, `90:1370`, `359:1555`, `90:1373`, `90:1376`) are row headers on the canvas, not
screens.

---

## 3. Watch — section `123:3945` · 456×456 round frames

✨ A **Watch Design System — WIP** section now exists (`364:2816`) — open decision #9 is in
motion. Until it lands, the watch notes below still apply.

| Flowchart screen | Frame | ID |
|---|---|---|
| Watch Tile | Watch Tile | `123:3440` |
| Set / 1 | Set / 1 | `123:3615` |
| Set / 2 | Set / 2 | `164:4389` |
| Edit Set (new — not in the flowchart) | Edit Set | `293:1520` |
| Timer red | Timer / Red | `123:3825` |
| Timer warning | Timer / Warning | `123:3861` |
| Timer green | Timer / Green | `123:3878` |
| Actions (swipe left) | Actions (Left) | `164:4103` |
| Change Workout | Change Workout | `123:3251`, `164:4192` |
| End Workout? | End Workout Confirmation | `164:4371` |
| Session Done | Summary | `164:4712` |

Watch **Adjust Weight** (swipe up) is still not drawn — brief §04 gap. `Edit Set` `293:1520` may
be it; 👤 confirm.

### ⚠️ Watch frames: "Figma is king" applies loosely here (Justin, 2026-08-22)

The watch was designed last and is the fuzziest part of the file. Read these frames as
**layout intent, not pixel truth**:

1. **Buttons are wrong in the file; use the platform's bottom-edge button instead.** Justin's
   frames draw the bottom buttons (End Workout → *Cancel / End*, Summary → *Finish*) as rounded
   rectangles with an approximated curve at the bottom. The intended look is the one Google
   uses: a pill-shaped button that, when anchored to the bottom of the round face, becomes a
   shape whose bottom edge follows the bezel curve. On Wear OS this is a stock component —
   **`EdgeButton`** in Compose for Wear OS Material 3 (`androidx.wear.compose.material3`),
   which computes that curve from the screen shape. **Build those bottom-anchored buttons with
   `EdgeButton`, not a custom shape, and do not match the Figma geometry.** Applies only to the
   bottom-edge buttons; everything else on the watch follows the frame.
2. **The watch strays from the phone design system** and will probably get its own (open
   decision #9). Until then there is no watch design system: take colours and type from the
   phone tokens, spacing and shape from the Wear OS Material 3 defaults, and layout from the
   frames. Don't invent a watch token set.
3. Copy: End Workout Confirmation says *"count as a miss"* — should be *failure*
   (`data-model.md` §1).

---

## 4. Things the crawls surfaced (for the plan)

From 2026-08-22, still true:

- **Mesocycle has a planned length** — "Week 3 of 5" on Workout A → `Mesocycle.plannedWeeks`.
- **Workout A shows a forecast** — "6 Workouts • 2,250 Lbs • ~55m". Duration estimate needs
  sets × (work + rest). [Inference]
- Two Post Set Timer frames still carry default names (`Android Compact - 2 / - 3`). 👤 rename.

New on 2026-08-31:

- **By Feel is now a specified engine** (§ above) — the `by-feel` branch of the progression code
  ("nothing automatic") is out of date and needs a follow-up implementation, plus a
  `FeelRating` row in the data model (the poke: reserve, form, per exercise per workout).
- **Absence deload designed**: 2 missed workouts → offer 10% all-exercise deload. Replaces the
  proposed days-based trigger; "missed" implies the plan knows its weekly schedule.
- **Settings exist** (Phase 5 scope grew): equipment, unit & dumbbell scale, goal (now 4
  options incl. *Vibing*), personal settings (bodyweight, height — new Profile fields), and
  **Exercise Data with export** — a new requirement (CSV/share? 👤 format).
- **Load types are six**: Barbell, Dumbbell, Body Weight, Kettlebell, Cable, Machine
  (filter drawer `403:13713`) — the data model's `loadType` enum needs kettlebell + cable.
- **Custom icon set** (22 icons, `436:4844`) — largely settles open decision #10 for domain
  icons; lucide (or similar) remains only for UI chrome (chevrons, home, back).
- Copy bugs listed inline above: By Feel AED sets group **1·3·3·10**, "Reps first" label in the
  By Feel flow, Exercise Data header, "Helt" typo in the engine.
