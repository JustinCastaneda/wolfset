import { describe, expect, it } from '@jest/globals';
import { applyKey, parseDraft } from './number-draft';

describe('Number Sheet typing rules', () => {
  it('integer mode: up to three digits, no dot, no leading zeros', () => {
    expect(applyKey('', '3', 'integer')).toBe('3');
    expect(applyKey('3', '2', 'integer')).toBe('32');
    expect(applyKey('123', '4', 'integer')).toBe('123');
    expect(applyKey('12', '.', 'integer')).toBe('12');
    expect(applyKey('0', '5', 'integer')).toBe('5');
  });

  it('decimal mode: one dot, a leading dot becomes 0., two decimals, four whole digits', () => {
    expect(applyKey('', '.', 'decimal')).toBe('0.');
    expect(applyKey('85', '.', 'decimal')).toBe('85.');
    expect(applyKey('85.', '.', 'decimal')).toBe('85.');
    expect(applyKey('85.5', '5', 'decimal')).toBe('85.55');
    expect(applyKey('85.55', '5', 'decimal')).toBe('85.55');
    expect(applyKey('1234', '5', 'decimal')).toBe('1234');
  });

  it('delete removes the last character', () => {
    expect(applyKey('85.', 'delete', 'decimal')).toBe('85');
    expect(applyKey('', 'delete', 'integer')).toBe('');
  });

  it('parses only finished numbers', () => {
    expect(parseDraft('')).toBeNull();
    expect(parseDraft('85.')).toBeNull();
    expect(parseDraft('85.5')).toBe(85.5);
    expect(parseDraft('32')).toBe(32);
  });
});
