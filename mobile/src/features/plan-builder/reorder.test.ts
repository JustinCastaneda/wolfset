import { describe, expect, it } from '@jest/globals';
import { dropIndex, moveItem, searchCopy } from './reorder';

describe('drag reorder (Day Summary edit state)', () => {
  it('lands on the nearest slot and never outside the list', () => {
    expect(dropIndex(0, 0, 80, 4)).toBe(0);
    expect(dropIndex(0, 39, 80, 4)).toBe(0);
    expect(dropIndex(0, 41, 80, 4)).toBe(1);
    expect(dropIndex(0, 800, 80, 4)).toBe(3);
    expect(dropIndex(3, -800, 80, 4)).toBe(0);
    expect(dropIndex(2, -120, 80, 4)).toBe(1);
  });

  it('moves one item and leaves the rest in order', () => {
    expect(moveItem(['a', 'b', 'c', 'd'], 0, 2)).toEqual(['b', 'c', 'a', 'd']);
    expect(moveItem(['a', 'b', 'c', 'd'], 3, 1)).toEqual(['a', 'd', 'b', 'c']);
    expect(moveItem(['a', 'b'], 1, 1)).toEqual(['a', 'b']);
    expect(moveItem(['a', 'b'], 5, 0)).toEqual(['a', 'b']);
  });
});

describe('Search Exercise copy', () => {
  it('asks for the first lift on an empty day, the next lift after', () => {
    expect(searchCopy('Day 1', 0)).toEqual({
      title: 'What’s the first lift?',
      subtitle: 'This starts Day 1. Add more after.',
    });
    expect(searchCopy('Day 1', 2).title).toBe('What’s the next lift?');
  });
});
