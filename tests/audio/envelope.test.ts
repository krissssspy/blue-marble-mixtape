import { describe, expect, it } from 'vitest';
import { envelope } from '../../src/audio/envelope.js';

describe('note envelope', () => {
  const shape = { attack: 0.25, release: 0.5 };
  const loudness = 0.8;

  it('is silent before, at the boundaries of, and after the note', () => {
    for (const time of [-1, 0, 2, 3]) {
      expect(envelope(time, 2, shape, loudness)).toBe(0);
    }
  });

  it('ramps linearly up to loudness and back down to zero', () => {
    expect(envelope(0.125, 2, shape, loudness)).toBeCloseTo(0.4);
    expect(envelope(0.25, 2, shape, loudness)).toBe(loudness);
    expect(envelope(1.5, 2, shape, loudness)).toBe(loudness);
    expect(envelope(1.75, 2, shape, loudness)).toBeCloseTo(0.4);
  });

  it('uses the lower ramp value when attack and release overlap', () => {
    const slow = { attack: 1, release: 1 };
    expect(envelope(0.125, 0.5, slow, loudness)).toBeCloseTo(0.1);
    expect(envelope(0.25, 0.5, slow, loudness)).toBeCloseTo(0.2);
    expect(envelope(0.375, 0.5, slow, loudness)).toBeCloseTo(0.1);
  });

  it('supports an immediate attack and release inside the note', () => {
    expect(envelope(0.01, 1, { attack: 0, release: 0 }, loudness)).toBe(loudness);
    expect(envelope(0.99, 1, { attack: 0, release: 0 }, loudness)).toBe(loudness);
    expect(envelope(0, 1, { attack: 0, release: 0 }, loudness)).toBe(0);
    expect(envelope(1, 1, { attack: 0, release: 0 }, loudness)).toBe(0);
  });
});
