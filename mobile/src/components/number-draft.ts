import type { KeypadKey } from './Keypad';

// The typing rules behind the Number Sheet, pure and tested. Integer mode is for sets
// and reps; decimal mode is for weight (Edit Weights' rules: one dot, a leading dot
// becomes "0.", at most two decimals and four integer digits).

export type NumberMode = 'integer' | 'decimal';

export function applyKey(draft: string, key: KeypadKey, mode: NumberMode): string {
  if (key === 'delete') return draft.slice(0, -1);
  if (key === '.') {
    if (mode === 'integer' || draft.includes('.')) return draft;
    return draft === '' ? '0.' : `${draft}.`;
  }
  const [whole, decimals] = draft.split('.');
  if (decimals !== undefined) return decimals.length >= 2 ? draft : `${draft}${key}`;
  const maxDigits = mode === 'integer' ? 3 : 4;
  if (whole.length >= maxDigits) return draft;
  // No leading zeros: "0" then "5" reads 5, not 05.
  return whole === '0' ? key : `${whole}${key}`;
}

/** The number a draft stands for, or null when it isn't one yet ("", "0.", ".") */
export function parseDraft(draft: string): number | null {
  if (draft === '' || draft.endsWith('.')) return null;
  const n = Number(draft);
  return Number.isFinite(n) ? n : null;
}
