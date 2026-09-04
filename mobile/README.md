# mobile — the WOLFSET phone app

Expo / React Native, TypeScript strict, Android-first. This is the real app (Phase 2+).
`spike-hr/` is throwaway Phase 0 code — never import from it.

## Commands

```bash
npm install
npm start                 # Metro
npm run android:phone     # build + install the phone app — asks which device (pick the phone)
npm run android           # same, but takes the first device ADB lists — see "Installing" below
npm run test              # jest — the rules, not the rendering
npm run verify            # typecheck + lint + format:check + test — what CI runs
npm run format            # write formatting
```

Before any `prebuild`: `npx expo-doctor && npx expo install --check`.

Expo Go cannot load the HR native module. Anything touching heart rate needs a dev build.

## Installing — phone vs watch (read this when both are on ADB)

Both apps are deliberately `app.wolfset` (the Data Layer only routes between apps with the
same id), so **an app installed on the wrong device replaces the other app in place**, with
no error. `npm run android` takes the first device ADB lists, and the watch is often first.

```bash
# Phone app — from mobile/. Asks which device; pick the phone.
npm run android:phone
# Same thing, spelled out. The `--` is required: without it npm eats the flag
# ("Unknown cli config --device") and Expo never sees it.
npm run android -- --device
npm run android -- --device <phone-serial>

# Watch app — from wear/. Build, then install to the watch only.
./gradlew assembleDebug
adb -s <watch-serial> install -r app/build/outputs/apk/debug/app-debug.apk
```

`adb devices` lists the serials. Never `./gradlew installDebug` with both attached: it
installs to every device. Wrong app on the watch? Run the two watch lines; it is replaced.

## Layout

```
src/
  app/          expo-router routes. File tree IS the route tree — keep it thin:
                a route file wires params and composes, it does not hold logic
  components/   presentational, reusable. Phase 3 fills this from the design system
  features/     feature-scoped logic + screens (e.g. features/set-loop/)
modules/        the one native module (Kotlin): modules/wolfset-hr — imported as @modules/*
  lib/          cross-cutting non-UI: storage, native module wrappers, formatting
```

`src/app/` is owned by expo-router — that is why the app lives in `mobile/`, not `app/`.

Rules of thumb:

- **Route files stay thin.** Logic belongs in `features/`, not in a route.
- **Business rules go in plain TypeScript**, not components. The set loop is a state
  machine (Phase 4) — it should be testable without rendering anything.
- Files and directories `kebab-case`; components `PascalCase`; hooks `useThing`.
- Absolute imports via `@/*` → `src/*`. No `../../..`.

## Styling — decided (open decision #4, 2026-08-22)

`StyleSheet.create` + a typed token module. **Not** NativeWind / Tailwind / styled-components.

- Figma **Variables** are the design tokens; `src/theme/tokens.ts` mirrors them (exported via
  the Figma MCP, not typed by hand). Components import `color` and `type` from there —
  never `palette`, never a hex.
- **No raw hex or magic numbers in components.** If a value isn't a token, the token is missing —
  add it (from Figma) rather than inlining it. `tsc` then catches a wrong token name in CI.
- One `const styles = StyleSheet.create({...})` per component file, below the component.

## Environment

`.env` is gitignored; `.env.example` documents the shape. See that file for why the Supabase
anon key is safe to ship and the `service_role` key never is.
