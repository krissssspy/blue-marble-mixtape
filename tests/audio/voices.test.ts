import { describe, expect, it } from 'vitest';
import { pulse } from '../../src/audio/voices.js';

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
