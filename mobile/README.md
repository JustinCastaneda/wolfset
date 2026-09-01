# mobile — the WOLFSET phone app

Expo / React Native, TypeScript strict, Android-first. This is the real app (Phase 2+).
`spike-hr/` is throwaway Phase 0 code — never import from it.

## Commands

```bash
npm install
npm start                 # Metro
npm run android           # dev build on a connected device
npm run test              # jest — the rules, not the rendering
npm run verify            # typecheck + lint + format:check + test — what CI runs
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

## Styling — decided (open decision #4, 2026-08-22)

`StyleSheet.create` + a typed token module. **Not** NativeWind / Tailwind / styled-components.

- Figma **Variables** are the design tokens. They map 1:1 to `src/theme/tokens.ts` (Phase 3a),
  and every color, type style, spacing and radius in a component comes from there.
- **No raw hex or magic numbers in components.** If a value isn't a token, the token is missing —
  add it (from Figma) rather than inlining it. `tsc` then catches a wrong token name in CI.
- One `const styles = StyleSheet.create({...})` per component file, below the component.
- Until `tokens.ts` lands, the placeholder screen carries the Figma values inline — that is a
  temporary exception, not a precedent.

## Environment

`.env` is gitignored; `.env.example` documents the shape. See that file for why the Supabase
anon key is safe to ship and the `service_role` key never is.
