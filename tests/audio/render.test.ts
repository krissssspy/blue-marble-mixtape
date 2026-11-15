import { describe, expect, it } from 'vitest';
import { renderScore } from '../../src/audio/render.js';
import type { ScoreEvent, VoiceName } from '../../src/audio/score.js';

function note(overrides: Partial<ScoreEvent> = {}): ScoreEvent {
  return {
    voice: 'pulse',
    start: 0.25,
    duration: 0.5,
    pitch: 10,
    loudness: 0.5,
    pan: 0,
    location: { kind: 'point', x: 0.5, y: 0.5 },
    ...overrides,
  };
}

describe('score synthesis', () => {
  it('returns empty stereo channels for an empty score', () => {
    expect(renderScore([], 1000)).toEqual({
      sampleRate: 1000,
      left: new Float32Array(),
      right: new Float32Array(),
    });
  });

  it('mixes overlapping arrivals with equal power and stays silent between notes', () => {
    const events = [note({ pan: -1 }), note(), note({ start: 1, duration: 0.25, pan: 1 })];
    const { left, right, sampleRate } = renderScore(events, 1000);
    expect(sampleRate).toBe(1000);
    expect(left.length).toBe(1250);
    expect(right.length).toBe(1250);
    for (const channel of [left, right]) {
      expect(channel.slice(0, 250).every((sample) => sample === 0)).toBe(true);
      expect(channel.slice(750, 1000).every((sample) => sample === 0)).toBe(true);
    }
    const center = -0.5 * Math.SQRT1_2;
    expect(left[300]).toBeCloseTo(-0.5 + center);
    expect(right[300]).toBeCloseTo(center);
    expect(left[1050]).toBe(0);
    expect(right[1050]).toBe(-0.5);
    expect(right[1001]).toBeGreaterThan(0);
    expect(right[1001]).toBeLessThan(0.5);
  });

  it('ceil-rounds fractional sample boundaries and sums against the original start time', () => {
    const score = [note({ start: 0.02525, duration: 0.017, pitch: 100, pan: -1 })];
    const { left, right } = renderScore(score, 1000);
    expect(left.length).toBe(43);
    expect(left.slice(0, 26).every((sample) => sample === 0)).toBe(true);
    expect(left[26]).toBeGreaterThan(0);
    expect(left[28]).toBeLessThan(0);
    expect(left[42]).not.toBe(0);
    expect(right.every((sample) => sample === 0)).toBe(true);
  });

  const voices: VoiceName[] = ['pulse', 'triangle', 'noise', 'pluck', 'organ', 'bell', 'pad'];
  it.each(voices)('routes %s notes through an audible centered voice', (voice) => {
    const { left, right } = renderScore([note({ voice, pitch: 200 })], 8000);
    expect(left).toEqual(right);
    expect(left.some((sample) => Math.abs(sample) > 0.01)).toBe(true);
    expect(left.every(Number.isFinite)).toBe(true);
  });

  it.each([0, -1, 1.5, Infinity, NaN])('rejects invalid sample rate %s', (sampleRate) => {
    expect(() => renderScore([], sampleRate)).toThrow(/sample rate/i);
  });
});

describe('deterministic bounded mixing', () => {
  it('renders seeded noise and plucks identically on repeated calls', () => {
    const score = [
      note({ voice: 'noise', pitch: 200, pan: -0.5 }),
      note({ voice: 'pluck', pitch: 340, pan: 0.75 }),
      note({ voice: 'noise', pitch: 320, start: 0.75 }),
    ];
    const first = renderScore(score, 8000);
    const second = renderScore(score, 8000);
    expect(first).toEqual(second);
    expect(first.left).not.toBe(second.left);
    expect(first.left.some((sample) => sample !== 0)).toBe(true);
  });

  it('clips the final sum symmetrically in both channels', () => {
    const score = Array.from({ length: 4 }, () => note({ loudness: 1 }));
    const { left, right } = renderScore(score, 1000);
    for (const channel of [left, right]) {
      expect(channel[300]).toBe(-1);
      expect(channel[370]).toBe(1);
      expect(channel.every((sample) => sample >= -1 && sample <= 1)).toBe(true);
    }
  });

  it('lets later notes cancel an earlier overfull mix before clipping', () => {
    const negative = note({ loudness: 1 });
    const positive = note({ loudness: 1, start: 0.29 });
    const score = [negative, negative, negative, positive, positive, positive];
    const { left, right } = renderScore(score, 1000);
    expect(left[300]).toBeCloseTo(0, 6);
    expect(right[300]).toBeCloseTo(0, 6);
  });
});
