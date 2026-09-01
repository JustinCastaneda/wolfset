# WOLFSET

A workout tracker built around one differentiator: a heart-rate-gated rest timer. Log a set,
the timer starts, and the next set unlocks when you've actually recovered — measured off a
Wear OS watch, not a fixed countdown.

## The naming rule (read this first)

The product is **WOLFSET**. Older design files say *Gym Wolf* — that is a stale label for the
same product, never a second product. Do not carry "Gym Wolf" (or "nextset") into identifiers,
package names, string tables, file names, or UI copy. Wordmark: **WOLF** red · **SET** white.
Reverse-DNS namespace: `app.wolfset.*` (domain is wolfset.app).

## Stack

- **Phone:** Expo / React Native, TypeScript strict, Android-first (iOS later)
- **Watch:** Kotlin / Compose for Wear OS (React Native does not target Wear OS)
- **The native seam:** one Kotlin native module on the phone — foreground service for the rest
  timer (survives screen-off/doze), HR stream ingestion from the Wearable Data Layer, and the
  recovered-gate decision. Everything else lives in JS. Decided 2026-08-19; revisit only on
  spike evidence (bridge latency / dropped events under doze).
- **Backend:** Supabase (Phase 6; likely local-first — gyms have no signal)

## Repository layout

```
docs/         build plan, decision log, design exports (handoff brief + flowchart)
spike-hr/     Phase 0 throwaway HR spike — full stack (wear + native module + RN screen).
              Deleted after the spike; findings live in docs/spike-findings.md
mobile/       the real Expo phone app (Phase 2+). NOT `app/` — expo-router owns that name
wear/         the real Kotlin/Compose watch app (Phase 7)
.claude/      project skills (.claude/skills/<name>/SKILL.md) and subsystem rules
```

`spike-hr/` is deliberately ugly, self-contained, throwaway code. Do not polish it, do not
reuse it in `mobile/` or `wear/`, and do not apply production conventions to it.

## Standing rules

- **Design sources:** the Claude Design Handoff Brief and Flowchart (exports in `docs/`) define
  the scoped screens and rules. Figma **Variables** are the authoritative design tokens; the
  Figma "Colors" documentation page is stale. `nextset UX Storyboard` is discarded brainstorming
  — never design or build from it.
- **55 frames ≠ 55 screens.** Journeys share a redrawn middle; build shared screens once.
- **Health Connect:** use `react-native-health-connect`, never the deprecated
  `expo-health-connect` — installing both duplicates `HealthConnectPackage` and breaks the
  Android build. (Live HR streaming is the Wearable Data Layer, not Health Connect —
  Health Connect is a historical data store.)
- **Android:** `minSdkVersion 26` via `expo-build-properties`.
- Run `npx expo-doctor && npx expo install --check` before every prebuild.
- **Secrets:** never commit `.env`, Supabase keys, or keystores. `.gitignore` covers them —
  keep it that way.
- **Typeface:** Geom (Google Fonts, OFL). The committed **variable-weight file is the source of
  truth** (`mobile/assets/fonts/Geom-Variable.ttf`); the per-weight statics beside it are
  *instanced from it* with fontTools because React Native on Android cannot select weights from
  a single variable font (Expo's own docs say to instance statics). Regenerate, never hand-edit:
  `fonttools varLib.instancer --update-name-table Geom-Variable.ttf wght=<W>`.
- Progression and pacing are **per-exercise** settings with a plan-level default, and
  progression is a strategy enum, not one rule (open decision #11 in the build plan).

## Commands

- Expo app (`spike-hr/mobile/`, later `mobile/`): `npm install`, `npx tsc --noEmit`,
  `npx expo-doctor`, `npx expo prebuild --platform android`, `npx expo run:android`
- Wear app (`spike-hr/wear/`, later `wear/`): `./gradlew assembleDebug` (or open in
  Android Studio). Real HR needs a physical watch — emulators fake it.
- EAS dev builds: `eas build --profile development --platform android` (Expo Go cannot load
  native modules; every HR test needs a dev build).

## Working agreement

Justin (design/product) reviews TypeScript but not Kotlin — keep Kotlin confined to the watch
app and the one native module, and explain Kotlin changes in plain terms in PRs and summaries.
Phase 0 is a kill gate: live BPM rendered in React under ~2s end-to-end **and** a definition
of "recovered", before any product code is built.
