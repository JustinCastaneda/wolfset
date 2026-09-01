// Design tokens — exported from Figma Variables (file 1RsF6PeYzGxdTso4FZDAbp, node 293:1647)
// via the Figma MCP on 2026-08-31. Figma Variables are the authority (root CLAUDE.md);
// do not edit values here without changing them in Figma first.
//
// Components import `color` and `type`, never `palette` — the palette exists so the
// semantic layer provably aliases it (tokens.test.ts) instead of holding copied hexes.

import type { TextStyle } from 'react-native';

/** Color primitives, exactly as the Figma Variables name them — except blue, which Figma
 *  still numbers 700/800/900/950 (build plan 3a). Renamed here to 600–900 so all five
 *  scales align; 👤 the same rename is pending inside Figma. */
export const palette = {
  red: {
    50: '#3c090a',
    100: '#651618',
    200: '#902426',
    300: '#bf3335',
    500: '#f04245',
    600: '#f9746e',
    700: '#fb9f98',
    800: '#fdc5c0',
    900: '#fee9e7',
  },
  yellow: {
    50: '#feefb9',
    100: '#fde696',
    200: '#fdde6d',
    300: '#fad542',
    500: '#f2ce40',
    600: '#ceaf34',
    700: '#aa902b',
    800: '#887320',
    900: '#675715',
  },
  green: {
    50: '#d1fbdd',
    100: '#b8f9cc',
    200: '#9bf8ba',
    300: '#77f6a8',
    500: '#3df593',
    600: '#31d07b',
    700: '#26ac65',
    800: '#1e8950',
    900: '#14683b',
  },
  neutral: {
    50: '#fffdfb',
    100: '#e1ddda',
    200: '#c3bebb',
    300: '#a5a09d',
    500: '#88827f',
    600: '#6b6663',
    700: '#514b48',
    800: '#38322f',
    900: '#201a18',
  },
  blue: {
    // Figma: 50, 100, 200, 300, 500, then 700→600, 800→700, 900→800, 950→900
    50: '#e0f2fb',
    100: '#aadef7',
    200: '#67c9f5',
    300: '#00b3f5',
    500: '#009be9',
    600: '#007bbf',
    700: '#005c90',
    800: '#003f64',
    900: '#00233c',
  },
} as const;

/** The semantic layer — the names components actually use (build plan 3a).
 *  Every value is an alias into the palette; tokens.test.ts enforces it. */
export const color = {
  brand: palette.red[500], // Figma `Brand`
  error: palette.red[300], // deliberately ≠ brand: error states must not look like primary buttons
  success: palette.green[600],
  warning: palette.yellow[500],
  bg: {
    base: palette.neutral[900], // Figma `Background`
    raised: palette.neutral[800], // Figma `MutedBackground`
  },
  text: {
    primary: palette.neutral[50], // Figma `TextPrimary`
    secondary: palette.neutral[200], // Figma `TextSecondary`
    muted: palette.neutral[300],
    onButton: palette.neutral[50], // Figma `TextButton`
  },
  border: palette.neutral[700], // Figma `Border` / `Accent`
  progression: {
    increase: palette.green[600],
    decrease: palette.red[300],
    hold: palette.yellow[500],
  },
  timer: {
    resting: palette.red[500],
    approaching: palette.yellow[500],
    ready: palette.green[500],
  },
  hr: {
    aboveThreshold: palette.red[500],
    belowThreshold: palette.green[500],
  },
} as const;

// Geom ships as one variable-weight file (root CLAUDE.md); RN selects the weight via
// fontWeight. The family is registered under this name when the font loads (Phase 3d).
const geom = (size: number, weight: TextStyle['fontWeight'], lineHeight: number): TextStyle => ({
  fontFamily: 'Geom',
  fontSize: size,
  fontWeight: weight,
  lineHeight,
});

/** The 14 type styles — Figma type Variables, verified complete 2026-08-31.
 *  Line heights are resolved to px (Figma's "100%" → equal to the font size). */
export const type = {
  displayXl: geom(128, '900', 128),
  displayL: geom(96, '900', 108),
  h1: geom(48, '900', 48),
  h2: geom(36, '600', 36),
  h3: geom(28, '500', 28),
  h3Bold: geom(28, '700', 28),
  title: geom(20, '900', 20),
  titleValue: geom(20, '800', 20),
  button: geom(20, '600', 24),
  body: geom(16, '400', 16),
  bodyLight: geom(16, '300', 24),
  label: geom(16, '600', 16),
  caption: geom(12, '500', 12),
  micro: geom(8, '700', 8), // ⚠️ open decision #6 — below the mobile floor, fails under font scaling
} as const;
