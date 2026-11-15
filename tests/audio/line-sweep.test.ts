import { describe, expect, it } from 'vitest';
import type { FeaturePack } from '../../src/audio/feature-pack.js';
import { lineSweepScore } from '../../src/audio/line-sweep.js';
import { midiToHz } from '../../src/audio/pitch.js';
import type { Recipe } from '../../src/audio/recipe.js';
import { scaleNote } from '../../src/audio/scale.js';
import { validateScore } from '../../src/audio/score.js';

const frame = {
  luminance: Uint8Array.of(0, 128, 255, 0, 0, 255),
  hue: Uint8Array.of(255, 64, 0, 255, 64, 0),
  saturation: Uint8Array.of(255, 128, 0, 255, 128, 0),
  edgeMagnitude: Uint8Array.of(10, 64, 192, 10, 64, 192),
  edgeDirection: new Uint8Array(6),
};
const pack: FeaturePack = { width: 3, height: 2, frames: [frame] };
const base: Recipe = {
  scan: 'lineSweep',
  pitchSource: 'brightness',
  loudnessSource: 'saturation',
  scale: 'minorPentatonic',
  voice: 'triangle',
  rhythm: 'free',
  tempo: 'medium',
};

const hz = (value: number) => midiToHz(scaleNote(value, base.scale, 48, 3));

describe('line-sweep score', () => {
  it('sweeps the whole image with left-to-right lines, ordered notes, and independent image mappings', () => {
    const score = lineSweepScore(pack, base);
    expect(validateScore(score)).toEqual({ ok: true });
    expect(score).toEqual(lineSweepScore(pack, base));
    const positions = [0, 0.5, 1];
    const period = 60 / 108 / 4;
    expect(score.map((event) => event.start)).toEqual(positions.map((_, index) => index * period));
    expect(score.map((event) => event.duration)).toEqual(positions.map(() => period * 1.4));
    expect(score.map((event) => event.pitch)).toEqual([hz(0), hz(64 / 255), hz(1)]);
    expect(score.map((event) => event.loudness)).toEqual([1, 128 / 255, 0]);
    expect(score.map((event) => event.voice)).toEqual(['triangle', 'triangle', 'triangle']);
    expect(score.map((event) => event.pan)).toEqual([-1, 0, 1]);
    expect(score.map((event) => event.location)).toEqual(
      positions.map((x) => ({ kind: 'line', from: { x, y: 0 }, to: { x, y: 1 } })),
    );
  });

  it('uses hue, edge magnitude, and brightness-weighted vertical height when selected', () => {
    expect(
      lineSweepScore(pack, { ...base, pitchSource: 'hue', loudnessSource: 'edges' }).map(
        ({ pitch, loudness }) => [pitch, loudness],
      ),
    ).toEqual([
      [hz(1), 10 / 255],
      [hz(64 / 255), 64 / 255],
      [hz(0), 192 / 255],
    ]);
    expect(
      lineSweepScore(pack, { ...base, pitchSource: 'height', loudnessSource: 'brightness' }).map(
        ({ pitch, loudness }) => [pitch, loudness],
      ),
    ).toEqual([
      [hz(0.5), 0],
      [hz(1), 64 / 255],
      [hz(0.5), 1],
    ]);
  });

  it('uses signed motion across frames and treats one-column stills as centered', () => {
    const motion = { ...base, pitchSource: 'motion', loudnessSource: 'motion' } satisfies Recipe;
    const still: FeaturePack = { width: 1, height: 1, frames: [frame] };
    const animated = {
      ...still,
      frames: [frame, { ...frame, motionX: Int8Array.of(-128), motionY: Int8Array.of(0) }],
    };
    expect(lineSweepScore(still, motion)[0]).toMatchObject({ pitch: hz(0), loudness: 0, pan: 0 });
    expect(lineSweepScore(animated, motion)[0]).toMatchObject({
      pitch: hz(1 / (2 * Math.SQRT2)),
      loudness: 1 / (2 * Math.SQRT2),
    });
    expect(lineSweepScore(still, { ...base, pitchSource: 'height' })[0].pitch).toBe(hz(0.5));
  });

  it('changes note lengths and onset density for grid and Euclidean rhythm', () => {
    const grid = lineSweepScore(pack, { ...base, rhythm: 'grid', tempo: 'fast', voice: 'organ' });
    expect(grid[0].voice).toBe('organ');
    expect(grid[0].duration).toBe((60 / 144 / 4) * 0.85);
    expect(grid[1].start).toBe(60 / 144 / 4);
    const wide = {
      width: 5,
      height: 1,
      frames: [frame],
    };
    expect(
      lineSweepScore(wide, { ...base, rhythm: 'euclidean', tempo: 'slow' }).map(
        ({ start }) => start,
      ),
    ).toEqual([0, 2 * (60 / 72 / 4), 4 * (60 / 72 / 4)]);
    expect(() => lineSweepScore(pack, { ...base, scan: 'radarSweep' })).toThrow(/line sweep/i);
  });
});
