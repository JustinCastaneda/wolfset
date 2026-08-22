# mobile — the WOLFSET phone app

Expo / React Native, TypeScript strict, Android-first. This is the real app (Phase 2+).
`spike-hr/` is throwaway Phase 0 code — never import from it.

## Commands

```bash
npm install
npm start                 # Metro
npm run android           # dev build on a connected device
npm run verify            # typecheck + lint + format:check — what CI runs
npm run format            # write formatting
```

Before any `prebuild`: `npx expo-doctor && npx expo install --check`.

Expo Go cannot load the HR native module. Anything touching heart rate needs a dev build.

## Layout

```
src/
  app/          expo-router routes. File tree IS the route tree — keep it thin:
                a route file wires params and composes, it does not hold logic
  components/   presentational, reusable. Phase 3 fills this from the design system
  features/     feature-scoped logic + screens (e.g. features/set-loop/)
  lib/          cross-cutting non-UI: storage, native module wrappers, formatting
```

`src/app/` is owned by expo-router — that is why the app lives in `mobile/`, not `app/`.

Rules of thumb:

- **Route files stay thin.** Logic belongs in `features/`, not in a route.
- **Business rules go in plain TypeScript**, not components. The set loop is a state
  machine (Phase 4) — it should be testable without rendering anything.
- Files and directories `kebab-case`; components `PascalCase`; hooks `useThing`.
- Absolute imports via `@/*` → `src/*`. No `../../..`.

## Styling — not decided yet

⚠️ Open decision #4 (NativeWind vs StyleSheet + tokens) is unresolved and **blocks Phase 3
and the implementation skills**. The placeholder screen uses inline `StyleSheet` so the app
boots; that is not a decision. Do not introduce a styling system until #4 is settled.

## Environment

`.env` is gitignored; `.env.example` documents the shape. See that file for why the Supabase
anon key is safe to ship and the `service_role` key never is.
