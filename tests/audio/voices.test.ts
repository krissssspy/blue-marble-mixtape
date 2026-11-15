import { describe, expect, it } from 'vitest';
import { bell, createNoise, createPluck, organ, pulse, triangle } from '../../src/audio/voices.js';

describe('pulse voice', () => {
  it('repeats at the requested frequency and switches at the chosen duty cycle', () => {
    const frequency = 200;
    for (const cycle of [0, 1, 7]) {
      const at = (phase: number) => pulse((cycle + phase) / frequency, frequency, 0.25);
      expect(at(0.1)).toBe(1);
      expect(at(0.249)).toBe(1);
      expect(at(0.251)).toBe(-1);
      expect(at(0.9)).toBe(-1);
    }
    expect(pulse(0.002, 200, 0.25)).toBe(-1);
    expect(pulse(0.002, 100, 0.25)).toBe(1);
    expect(pulse(0.002, 200, 0.5)).toBe(1);
    expect(pulse(0.125, 8, 0.5)).toBe(1);
    expect(pulse(0.0625, 8, 0.5)).toBe(-1);
  });
});

function magnitude(samples: readonly number[], cycles: number): number {
  let real = 0;
  let imaginary = 0;
  for (const [index, sample] of samples.entries()) {
    const phase = (2 * Math.PI * cycles * index) / samples.length;
    real += sample * Math.cos(phase);
    imaginary += sample * Math.sin(phase);
  }
  return (2 * Math.hypot(real, imaginary)) / samples.length;
}

describe('triangle voice', () => {
  it('rises and falls linearly with a period set by the requested frequency', () => {
    const frequency = 128;
    const period = 1 / frequency;
    expect(triangle(0, frequency)).toBe(-1);
    expect(triangle(period / 8, frequency)).toBe(-0.5);
    expect(triangle(period / 2, frequency)).toBe(1);
    expect(triangle((3 * period) / 4, frequency)).toBe(0);
    expect(triangle(period, frequency)).toBe(-1);
    expect(triangle(period, frequency / 2)).toBe(1);
  });

  it('has the requested fundamental and odd harmonics with no even harmonics', () => {
    const frequency = 128;
    const sampleRate = 8192;
    const samples = Array.from({ length: 64 }, (_, index) =>
      triangle(index / sampleRate, frequency),
    );
    expect(magnitude(samples, 1)).toBeGreaterThan(0.8);
    expect(magnitude(samples, 3)).toBeGreaterThan(0.08);
    expect(magnitude(samples, 5)).toBeGreaterThan(0.03);
    expect(magnitude(samples, 2)).toBeLessThan(1e-12);
    expect(magnitude(samples, 4)).toBeLessThan(1e-12);
    expect(magnitude(samples, 6)).toBeLessThan(1e-12);
  });
});

describe('noise voice', () => {
  it('produces the same independent centered samples for the same seed', () => {
    const first = createNoise(12);
    const second = createNoise(12);
    const other = createNoise(13);
    const draw = (next: () => number) => Array.from({ length: 2048 }, next);
    const samples = draw(first);
    expect(samples).toEqual(draw(second));
    expect(samples).not.toEqual(draw(other));
    expect(Math.min(...samples)).toBeGreaterThanOrEqual(-1);
    expect(Math.max(...samples)).toBeLessThan(1);
    expect(Math.min(...samples)).toBeLessThan(-0.98);
    expect(Math.max(...samples)).toBeGreaterThan(0.98);
    expect(
      Math.abs(samples.reduce((total, sample) => total + sample, 0) / samples.length),
    ).toBeLessThan(0.04);

    const energy = samples.reduce((total, sample) => total + sample * sample, 0);
    for (const lag of [1, 2, 3, 5, 13, 31, 64]) {
      const cross = samples
        .slice(lag)
        .reduce((total, sample, index) => total + sample * samples[index], 0);
      expect(Math.abs(cross / energy)).toBeLessThan(0.07);
    }
  });
});

function rms(samples: readonly number[]): number {
  return Math.sqrt(
    samples.reduce((energy, sample) => energy + sample * sample, 0) / samples.length,
  );
}

describe('pluck voice', () => {
  const sampleRate = 24000;

  it.each([200, 300])('rings near the requested %s Hz and decays', (frequency) => {
    const samples = Array.from({ length: 12000 }, createPluck(frequency, sampleRate, 37));
    const period = sampleRate / frequency;
    const start = Math.round(4 * period);
    const reference = samples.slice(start, start + Math.round(8 * period));
    const correlation = (lag: number) => {
      const nearby = samples.slice(start + lag, start + lag + reference.length);
      const cross = reference.reduce((sum, sample, index) => sum + sample * nearby[index], 0);
      return cross / (rms(reference) * rms(nearby) * reference.length);
    };
    const candidates = Array.from({ length: 11 }, (_, index) => period - 5 + index);
    const best = candidates.reduce((winner, candidate) =>
      correlation(candidate) > correlation(winner) ? candidate : winner,
    );
    expect(Math.abs(best - period)).toBeLessThanOrEqual(1);
    expect(correlation(best)).toBeGreaterThan(0.93);
    expect(rms(samples.slice(0, 1000))).toBeGreaterThan(0.18);
    expect(rms(samples.slice(-1000))).toBeLessThan(rms(samples.slice(0, 1000)) * 0.35);
  });

  it('uses the seed to excite the string reproducibly', () => {
    const draw = (seed: number) => Array.from({ length: 256 }, createPluck(440, sampleRate, seed));
    expect(draw(5)).toEqual(draw(5));
    expect(draw(5)).not.toEqual(draw(6));
  });
});

describe('organ voice', () => {
  it('adds the fundamental and weighted drawbar harmonics', () => {
    const frequency = 128;
    const sampleRate = 8192;
    const samples = Array.from({ length: 64 }, (_, index) => organ(index / sampleRate, frequency));
    const stops = [1, 0.6, 0.4, 0.2, 0, 0.1, 0];
    for (const [index, stop] of stops.entries()) {
      expect(magnitude(samples, index + 1)).toBeCloseTo(stop / 2.3, 9);
    }
    expect(Math.max(...samples)).toBeLessThanOrEqual(1);
    expect(Math.min(...samples)).toBeGreaterThanOrEqual(-1);
  });
});

describe('FM bell voice', () => {
  it('has inharmonic sidebands and a tail that decays over time', () => {
    const frequency = 256;
    const sampleRate = 8192;
    const samples = Array.from({ length: sampleRate }, (_, index) =>
      bell(index / sampleRate, frequency),
    );
    const attack = samples.slice(0, 2048);
    const carrier = (frequency * attack.length) / sampleRate;
    expect(magnitude(attack, carrier)).toBeGreaterThan(0.25);
    expect(magnitude(attack, carrier * (Math.SQRT2 - 1))).toBeGreaterThan(0.26);
    expect(magnitude(attack, carrier * (1 + Math.SQRT2))).toBeGreaterThan(0.26);
    expect(magnitude(attack, carrier * 2)).toBeLessThan(0.025);
    expect(rms(samples.slice(-2048))).toBeLessThan(rms(attack) * 0.06);
    expect(Math.max(...samples.map(Math.abs))).toBeLessThanOrEqual(1);
  });
});
