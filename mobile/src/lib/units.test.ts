import { describe, expect, it } from '@jest/globals';
import { displayHeight, displayWeight, stepHeight, stepWeight } from './units';

describe('Personal Info units (433:23386)', () => {
  it('shows pounds as stored and kilos converted', () => {
    expect(displayWeight(165, 'lb')).toBe(165);
    expect(displayWeight(165, 'kg')).toBe(74.8);
  });

  it('steps a pound in imperial and half a kilo in metric, never below zero', () => {
    expect(stepWeight(165, 'lb', 1)).toBe(166);
    expect(displayWeight(stepWeight(165, 'kg', -1), 'kg')).toBe(74.3);
    expect(stepWeight(0.5, 'lb', -1)).toBe(0);
  });

  it('shows height as feet and inches, or centimetres', () => {
    expect(displayHeight(175.3, 'lb')).toBe('5’9”');
    expect(displayHeight(175.3, 'kg')).toBe('175 cm');
    expect(displayHeight(182.9, 'lb')).toBe('6’0”');
  });

  it('steps an inch in imperial and a centimetre in metric', () => {
    expect(displayHeight(stepHeight(175.3, 'lb', 1), 'lb')).toBe('5’10”');
    expect(stepHeight(175, 'kg', -1)).toBe(174);
  });
});
