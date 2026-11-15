import { describe, expect, it } from 'vitest';
import { applyConsoleBus } from '../../src/audio/console-bus.js';

const pcm = {
  sampleRate: 8,
  left: Float32Array.of(0.13, 0.1, -0.4, 0.6, 0.92, -0.7, -1),
  right: Float32Array.of(-0.9, 0.1, 0, 0.6, 0.55, -0.7, -0.28),
};

describe('console bus', () => {
  it('reduces each channel to signed PCM levels at the requested rate', () => {
    expect(applyConsoleBus(pcm, { sampleRate: 4, bitDepth: 3 })).toEqual({
      sampleRate: 4,
      left: Float32Array.of(0.25, -0.5, 0.75, -1),
      right: Float32Array.of(-1, 0, 0.5, -0.25),
    });
    expect(pcm.left[0]).toBeCloseTo(0.13);
    expect(pcm.left.length).toBe(7);
  });

  it('handles noninteger decimation ratios and preserves an empty mix', () => {
    const sampleRate = 3;
    const bitDepth = 4;
    expect(applyConsoleBus(pcm, { sampleRate, bitDepth }).left).toEqual(
      Float32Array.of(0.125, -0.375, -0.75),
    );
    const silence = { ...pcm, left: new Float32Array(), right: new Float32Array() };
    expect(applyConsoleBus(silence, { sampleRate, bitDepth })).toEqual({
      ...silence,
      sampleRate,
    });
  });

  it.each([0, 9, -1, 2.5])('rejects invalid output rate %s', (sampleRate) => {
    expect(() => applyConsoleBus(pcm, { bitDepth: 8, sampleRate })).toThrow(/sample rate/i);
  });

  it.each([0, -1, 25, 8.5])('rejects invalid bit depth %s', (bitDepth) => {
    expect(() => applyConsoleBus(pcm, { bitDepth, sampleRate: 8 })).toThrow(/bit depth/i);
  });

  it('rejects channels of unequal lengths', () => {
    expect(() =>
      applyConsoleBus({ ...pcm, right: pcm.right.subarray(1) }, { bitDepth: 8, sampleRate: 8 }),
    ).toThrow(/channel length/i);
  });
});
