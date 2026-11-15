import { describe, expect, it } from 'vitest';
import { seededRandom } from '../../src/audio/random.js';

function draw(next: () => number, count: number): number[] {
  return Array.from({ length: count }, () => next());
}

describe('seededRandom', () => {
  it('returns the pinned reference values for seed 1', () => {
    const next = seededRandom(1);
    expect(draw(next, 3)).toEqual([0.6270739405881613, 0.002735721180215478, 0.5274470399599522]);
  });

  it('returns the pinned reference values for seed 123456789', () => {
    const next = seededRandom(123456789);
    expect(draw(next, 3)).toEqual([0.2577907438389957, 0.9707721115555614, 0.7853280142880976]);
  });

  it('returns identical sequences for the same seed', () => {
    expect(draw(seededRandom(42), 100)).toEqual(draw(seededRandom(42), 100));
  });

  it('returns different sequences for different seeds', () => {
    expect(draw(seededRandom(1), 100)).not.toEqual(draw(seededRandom(2), 100));
  });

  it('stays in [0, 1) with a mean near one half', () => {
    const values = draw(seededRandom(2024), 10000);
    expect(values.every((v) => v >= 0 && v < 1)).toBe(true);
    const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
    expect(mean).toBeGreaterThan(0.48);
    expect(mean).toBeLessThan(0.52);
  });

  it('keeps generators independent of each other', () => {
    const reference = draw(seededRandom(7), 2);
    const a = seededRandom(7);
    const b = seededRandom(7);
    a();
    a();
    a();
    expect(b()).toBe(reference[0]);
    expect(b()).toBe(reference[1]);
  });

  it('stays exact far into the sequence (state wraps to 32 bits)', () => {
    const next = seededRandom(1);
    for (let i = 0; i < 6000000; i++) next();
    expect(next()).toBe(0.8852726633194834);
  }, 20000);
});
