# Figma inventory — `Wolfset` (file `1RsF6PeYzGxdTso4FZDAbp`)

**Crawled 2026-08-22** from the page at node `6:10` via the Figma MCP (`get_metadata`), not by
hand. Every node ID below is real and can be opened as
`https://www.figma.com/design/1RsF6PeYzGxdTso4FZDAbp/Wolfset?node-id=<id with - instead of :>`.

**Why this file exists:** Figma is the source of truth for everything visual — screens, tokens,
spacing. Agents must build from the exact node, never from memory. This is the lookup table.
Re-crawl when Justin says the file changed; the crawl date above is the freshness signal.

> Figma is king for visuals. The flowchart (`docs/design/flowchart.html`) is king for edges and
> rules. When a frame here and the flowchart disagree on *behaviour*, the flowchart wins; on
> *appearance*, Figma wins.

---

## 1. Design System — section `293:1647`

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

14 styles in the frame (the plan says 15; recount when tokens are exported). Only five are also
Variables today (`Display XL`, `H1`, `Button`, `Body`, `Micro`) — the rest need Variables before
`tokens.ts` can be generated rather than transcribed. **👤 Justin: make all 14 type styles
Variables.**

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
| **Card** 🚧 | `359:1597` | Default `359:1570` / Outline `359:1596` | 2 | **in progress — Justin componentising (2026-08-22)** |
| **Radio Card** 🚧 | `359:1726` | Default `359:1725` / Selected `359:1724` | 2 | **in progress** — the onboarding / "How You Get Stronger" cards |
| **List Item** | `114:2626` (lives in Web App, not here) | — | 1 | 412×80 — the Search Exercise row. 👤 move into Components |

Not yet in the library but used on screens (plan §3c): Timer ring, Numeric keypad, Set/Exercise
row, Stepper (±5), Segmented progress bar. The **Button Group** (`123:3015`, `123:2979` on the
New Plan frames; the 1/3/5/10/✎ rows on Add Exercise Details) is a repeated pattern too — a
candidate for componentising alongside Card and Radio Card.

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
| Name this Plan | New Plan | `101:994` | |
| How You Get Stronger | New Plan | `114:3014` | three Radio Cards |
| What's the first lift? | Search Exercise | `70:339`, `101:814` | shared with Freestyle |
| Add Exercise | Add Exercise | `48:463` | |
| **Add Exercise Details** | Add Exercise Details | **`123:1092`** (412×1214) | sets / starting reps / max reps before weight increase / progression / pacing — see `data-model.md` |
| Override Applied | Add Exercise Details / Override Applied | `123:1654` | |
| Progression Override | Progression Override | `114:3989` (412×1080), `123:2105` (412×949) | two drawings |
| Day Summary | Day Summary | `123:1944` | |
| Plan Summary | Plan Summary | `123:2530` | |

### Train — the shared engine

| Flowchart screen | Frame | ID | Notes |
|---|---|---|---|
| **Workout A** (home) | Workout Summary | `34:778` | "Plan A • Week 3 of 5" — a meso has a planned week count |
| Workout A — deload suggestion 🚧 | Workout Summary - Deload Suggestion | `359:1470` | **in progress** — the absence/plateau deload prompt |
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

## 4. Things the crawl surfaced (for the plan)

- **Mesocycle has a planned length** — "Week 3 of 5" on Workout A. `data-model.md` needs
  `Mesocycle.plannedWeeks` and a derived current week. *(Added to the follow-up list.)*
- **Workout A shows a forecast** — "6 Workouts • 2,250 Lbs • ~55m": exercise count, projected
  volume, and an estimated duration. Duration estimate needs sets × (work + rest) — rest comes
  from pacing, work time needs a per-set constant. [Inference]
- **Deload suggestion is being designed** (`359:1470`) — removes one of the five "not designed"
  gaps once it lands.
- **Card and Radio Card are in progress** — Phase 3c build order should wait for them to settle.
- Type styles: 9 of 14 are not Variables yet; needed before tokens can be exported rather than
  typed by hand.
