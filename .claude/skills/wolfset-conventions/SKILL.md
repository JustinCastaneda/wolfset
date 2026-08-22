---
name: wolfset-conventions
description: How code is written in the WOLFSET phone app (mobile/) — structure, naming, styling, state, errors, testing, and the checks that must pass. Load before writing or reviewing any TypeScript in mobile/.
---

# WOLFSET conventions (`mobile/`)

These are the rules every agent follows when touching `mobile/`. The root `CLAUDE.md` holds the
product rules (naming, stack, Health Connect, secrets); this skill holds the *code* rules. If the
two ever disagree, `CLAUDE.md` wins — fix this file.

Justin reviews every TypeScript PR and is not a developer. Optimise for code he can read: plain
names, small files, one idea per function, comments that say *why*.

## 1. Structure

```
mobile/src/
  app/          expo-router routes. File tree IS the route tree — keep it thin
  components/   presentational, reusable UI. Phase 3 fills this from the design system
  features/     feature-scoped logic + screens, one folder per feature (features/set-loop/)
  lib/          cross-cutting, non-UI: storage, native-module wrappers, formatting, time
  theme/        tokens.ts (from Figma Variables) and nothing else that invents values
```

- **Route files are wiring.** A file in `app/` reads params, composes a feature screen, and
  returns. No business logic, no data access, no styles beyond layout glue.
- **Features own their logic.** `features/<name>/` contains the screen(s), hooks, and a plain-TS
  module for the rules. Cross-feature imports go through `lib/` or `components/`, never
  feature-to-feature.
- **Business rules are plain TypeScript** — pure functions and state machines that can be tested
  without rendering anything. The set loop (Phase 4) and the recovered-gate decision are the
  canonical examples: a `reduce(state, event) → state` with no React in it.
- Imports are absolute: `@/features/set-loop/...`. Never `../../..`.
- Never import from `spike-hr/`. It is throwaway Phase 0 code.

## 2. Naming

| Thing | Convention | Example |
|---|---|---|
| Files, directories | `kebab-case` | `rest-timer.ts`, `set-loop/` |
| React components | `PascalCase`, one per file, file matches name | `TimerRing.tsx` |
| Hooks | `useThing` | `useRestTimer` |
| Types / interfaces | `PascalCase`, no `I` prefix | `WorkoutSet`, not `IWorkoutSet` |
| Constants | `SCREAMING_SNAKE` only for true constants | `MIN_REST_SECONDS` |
| Booleans | read as a question | `isRecovered`, `hasWatch` |
| Events / actions | past tense for facts, imperative for commands | `setLogged`, `startRest` |

- Product name is **WOLFSET** everywhere: identifiers, strings, package names. `Gym Wolf` and
  `nextset` are stale labels that must not appear in code.
- Domain words are fixed — use them, don't invent synonyms: *workout · exercise · set · rep ·
  rest · recovered · plan · mesocycle · progression · pacing*. An "exercise" is the movement
  (Squat); a "set" is one performance of it; a "workout" is one session.

## 3. Styling — `StyleSheet` + typed tokens (decision #4)

- `StyleSheet.create` only. **No** NativeWind, Tailwind, styled-components, or inline style
  objects in JSX (except a single dynamic value, e.g. `{ width }`).
- Every visual value comes from `src/theme/tokens.ts`, which mirrors **Figma Variables** exactly.
  No raw hex, no magic numbers. If the value isn't a token, the token is missing — add it from
  Figma, don't inline it.
- Figma Variables are the authority. The Figma "Colors" documentation page is stale (it numbers
  neutrals differently) — never copy from it.
- Typeface is Geom (variable weight). Type styles are tokens too (`type.h1`, `type.body`…).
- Touch targets in the workout path are **44px minimum**. Gym hands are sweaty and shaking.
- One `const styles = StyleSheet.create({...})` at the bottom of each component file.

## 4. State

- **Local-first (decision #1).** The on-device database is the source of truth. Every write
  lands locally first and must succeed with no network. Sync is a background concern (Phase 6).
- Three kinds of state, kept apart:
  1. **Persistent** — workouts, sets, plans. Lives in storage behind `lib/` repositories.
  2. **Session** — the live set loop, timer, HR stream. A state machine in `features/`.
  3. **UI** — what's expanded, which sheet is open. `useState` in the component. Never persisted.
- State machines are explicit: a discriminated union for state, a discriminated union for
  events, one pure reducer. No booleans that combine into impossible states.
- Time comes from an injectable clock (`now: () => number`) so timers are testable and so the
  foreground service (native) and JS never disagree about what "now" is.
- The native module is wrapped once, in `lib/native/`. Nothing else imports it directly.

## 5. Errors

- Business rules return results, they don't throw: `{ ok: true, value } | { ok: false, reason }`.
  Throwing is for programmer errors (a bug), not for expected outcomes (watch disconnected).
- Every expected failure in the workout path has a designed fallback, because the user is
  mid-set with a bar on their back: HR gone → countdown continues on time alone; storage write
  fails → retry, then keep the set in memory and surface a non-blocking banner. Never a modal
  that blocks logging a set.
- Log with context (`feature`, `event`, ids), no PII. No `console.log` left in committed code.
- Don't catch what you can't handle. A bare `catch {}` is a bug.

## 6. Testing

- Test the rules, not the rendering. Pure logic in `features/*/` and `lib/` gets unit tests;
  components get tests only when they have behaviour (a keypad, a stepper), not for layout.
- Tests live next to the code: `rest-timer.ts` → `rest-timer.test.ts`.
- Name tests as sentences about behaviour: `it('unlocks the next set when HR drops below the
  threshold for two consecutive samples')`.
- No mocking the clock with sleeps — inject it (see §4).
- The runner (`jest-expo`) is added with the first piece of logic worth testing (Phase 4). When it
  lands, `npm test` joins `npm run verify` and CI.

## 7. The checks — what "done" means

Before opening a PR, run in `mobile/`:

```bash
npm run verify        # tsc --noEmit + eslint + prettier --check — exactly what CI runs
npx expo-doctor       # project health; must be all checks passed
```

Report the results in the PR description as explicit pass/fail lines. Justin does not run the
code; the checks are the signal. A PR that says "should work" without them is not done.

Before any `prebuild`: `npx expo-doctor && npx expo install --check`.

## 8. Pull requests

- One unit of work per branch and PR. Justin merges.
- Title states the outcome, body states what changed and **what was verified, with results**.
- Any Kotlin (native module, watch app) gets a plain-language explanation of what it does and
  why — Justin reviews TypeScript, not Kotlin.
- Design-derived work cites the exact Figma node or handoff-brief section it was built from.
  Never build UI from memory or from the discarded `nextset UX Storyboard`.
