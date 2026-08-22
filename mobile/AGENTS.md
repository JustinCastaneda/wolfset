# Working in `mobile/`

**Expo changes fast.** Read the exact versioned docs for the SDK in `package.json`
(currently SDK 57: https://docs.expo.dev/versions/v57.0.0/) before writing code. Do not rely
on remembered API shapes — `expo-file-system`, `expo-router` and the splash/asset APIs have
all changed shape recently.

Project rules live in the root `CLAUDE.md` (naming, stack, Health Connect, secrets).
Structure and conventions for this app: `mobile/README.md`.

Two that bite here specifically:

- The product is **WOLFSET**. Never `Gym Wolf` or `nextset` in identifiers or copy.
- Styling is **`StyleSheet` + typed tokens** (decision #4). Do not add NativeWind, Tailwind,
  styled-components or any CSS-in-JS layer. Tokens come from Figma Variables, never invented.
  Full conventions: `.claude/skills/wolfset-conventions/SKILL.md`.

Run `npm run verify` before opening a PR; that is exactly what CI runs.
