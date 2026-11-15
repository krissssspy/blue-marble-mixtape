import { describe, expect, it } from 'vitest';
import { pulse, triangle } from '../../src/audio/voices.js';

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
