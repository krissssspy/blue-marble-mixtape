import { describe, expect, it } from 'vitest';
import { scaleNote, type ScaleName } from '../../src/audio/scale.js';

const ROOT = 60;

const scales: ReadonlyArray<[ScaleName, number[]]> = [
  ['majorPentatonic', [0, 2, 4, 7, 9]],
  ['minorPentatonic', [0, 3, 5, 7, 10]],
  ['dorian', [0, 2, 3, 5, 7, 9, 10]],
  ['phrygian', [0, 1, 3, 5, 7, 8, 10]],
  ['wholeTone', [0, 2, 4, 6, 8, 10]],
  ['chromatic', [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]],
];

function sweep(scale: ScaleName, rootNote: number, octaves: number, count: number): number[] {
  return Array.from({ length: count }, (_, i) =>
    scaleNote((i + 0.5) / count, scale, rootNote, octaves),
  );
}

describe('scaleNote', () => {
  it.each(scales)(
    'sweeping one octave of %s from root 60 yields its notes in order',
    (scale, offsets) => {
      const expected = offsets.map((o) => ROOT + o);
      expect(sweep(scale, ROOT, 1, offsets.length)).toEqual(expected);
    },
  );

  it.each(scales)(
    'gives the root at value 0 and the highest note at value 1 for %s',
    (scale, offsets) => {
      expect(scaleNote(0, scale, ROOT, 1)).toBe(ROOT);
      expect(scaleNote(1, scale, ROOT, 1)).toBe(ROOT + offsets[offsets.length - 1]);
    },
  );

  it('continues the pattern 12 semitones higher for a second octave', () => {
    const offsets = [0, 2, 4, 7, 9];
    const expected = [...offsets.map((o) => 48 + o), ...offsets.map((o) => 48 + 12 + o)];
    expect(sweep('majorPentatonic', 48, 2, 10)).toEqual(expected);
    expect(scaleNote(1, 'majorPentatonic', 48, 2)).toBe(48 + 12 + 9);
  });

  it('clamps values below 0 to the lowest note and above 1 to the highest note', () => {
    expect(scaleNote(-0.5, 'dorian', ROOT, 2)).toBe(ROOT);
    expect(scaleNote(-100, 'dorian', ROOT, 2)).toBe(ROOT);
    expect(scaleNote(1.5, 'dorian', ROOT, 2)).toBe(ROOT + 12 + 10);
    expect(scaleNote(100, 'dorian', ROOT, 2)).toBe(ROOT + 12 + 10);
  });

  it('puts a slice boundary in the upper slice', () => {
    // Five notes in one octave: boundaries at 0.2, 0.4, 0.6, 0.8.
    expect(scaleNote(0.2, 'majorPentatonic', ROOT, 1)).toBe(ROOT + 2);
    expect(scaleNote(0.5, 'wholeTone', ROOT, 1)).toBe(ROOT + 6);
  });
});
