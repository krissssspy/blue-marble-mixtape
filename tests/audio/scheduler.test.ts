import { describe, expect, it } from 'vitest';
import { createScheduler } from '../../src/audio/scheduler.js';
import type { ScoreEvent } from '../../src/audio/score.js';

function note(start: number): ScoreEvent {
  return {
    start,
    duration: 1,
    voice: 'pulse',
    pitch: 220,
    loudness: 0.5,
    pan: 0,
    location: { kind: 'point', x: start / 2, y: 0.5 },
  };
}

describe('score lookahead scheduler', () => {
  it('delivers each onset once, including events that share a timestamp on the boundary', () => {
    const opening = note(0);
    const firstChord = note(0.5);
    const secondChord = { ...note(0.5), pitch: 440 };
    const ending = note(2);
    const scheduler = createScheduler([opening, firstChord, secondChord, ending], 0.25);

    expect(scheduler.take(0)).toEqual([opening]);
    expect(scheduler.take(0)).toEqual([]);
    expect(scheduler.take(0.249)).toEqual([]);
    expect(scheduler.take(0.25)).toEqual([firstChord, secondChord]);
    expect(scheduler.take(0.1)).toEqual([]);
    expect(scheduler.take(1.749)).toEqual([]);
    expect(scheduler.take(1.75)).toEqual([ending]);
    expect(scheduler.take(10)).toEqual([]);
  });

  it('hands out any overdue onsets once when a clock update arrives late', () => {
    const notes = [note(0.25), note(1), note(2)];
    const scheduler = createScheduler(notes, 0);
    expect(scheduler.take(1.5)).toEqual(notes.slice(0, 2));
    expect(scheduler.take(2)).toEqual(notes.slice(2));
    expect(scheduler.take(3)).toEqual([]);
    expect(createScheduler([], 1).take(0)).toEqual([]);
  });

  it.each([NaN, Infinity, -0.01])('rejects invalid lookahead %s', (lookahead) => {
    expect(() => createScheduler([], lookahead)).toThrow(/lookahead/i);
  });
});
