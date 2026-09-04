import { describe, expect, it } from '@jest/globals';
import { color, palette, type } from './tokens';

// These tests are the plan's 3a acceptance items: the semantic layer genuinely aliases
// the primitives, error ≠ brand, the scales align, and the type scale is complete.

const flatten = (obj: object): unknown[] =>
  Object.values(obj).flatMap((v) => (typeof v === 'object' && v !== null ? flatten(v) : [v]));

describe('palette', () => {
  it('all five scales share the same steps (blue renumbered from Figma 700–950)', () => {
    const steps = Object.keys(palette.red);
    for (const scale of Object.values(palette)) {
      expect(Object.keys(scale)).toEqual(steps);
    }
  });

  it('every primitive is a well-formed hex color', () => {
    for (const value of flatten(palette)) {
      expect(value).toMatch(/^#[0-9a-f]{6}$/);
    }
  });
});

describe('semantic layer', () => {
  it('every semantic color aliases a palette primitive — no copied hexes', () => {
    const primitives = new Set(flatten(palette));
    for (const value of flatten(color)) {
      expect(primitives).toContain(value);
    }
  });

  it('error is not brand — error states must not look like primary buttons', () => {
    expect(color.error).not.toBe(color.brand);
    expect(color.brand).toBe(palette.red[500]);
    expect(color.error).toBe(palette.red[300]);
  });

  it('matches the Figma semantic Variables that already exist', () => {
    expect(color.bg.base).toBe('#201a18'); // Background
    expect(color.brand).toBe('#f04245'); // Brand
    expect(color.text.primary).toBe('#fffdfb'); // TextPrimary
    expect(color.text.secondary).toBe('#c3bebb'); // TextSecondary
    expect(color.border).toBe('#514b48'); // Border
  });
});

describe('type scale', () => {
  it('has all 14 styles from the Figma type Variables', () => {
    expect(Object.keys(type)).toHaveLength(14);
  });

  it('every style is Geom with a line box tall enough for its descenders', () => {
    for (const style of Object.values(type)) {
      expect(style.fontFamily).toBe('Geom');
      // Geom's ascender + descender is 1.25× the size; anything less clips a "g".
      expect(style.lineHeight).toBeGreaterThanOrEqual(style.fontSize! * 1.25);
    }
  });

  it('spot-checks the Figma values: Button 20 SemiBold, Body 16/20, Display XL 128 Black', () => {
    expect(type.button).toMatchObject({ fontSize: 20, lineHeight: 25, fontWeight: '600' });
    expect(type.body).toMatchObject({ fontSize: 16, lineHeight: 20 });
    expect(type.displayXl).toMatchObject({ fontSize: 128, lineHeight: 160, fontWeight: '900' });
  });
});
