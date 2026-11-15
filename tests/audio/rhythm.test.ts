import { describe, expect, it } from 'vitest';
import { euclideanRhythm } from '../../src/audio/rhythm.js';

function render(pattern: boolean[]): string {
  return pattern.map((on) => (on ? 'x' : '.')).join('');
}

const exact: ReadonlyArray<[number, number, string]> = [
  [3, 8, 'x..x..x.'],
  [2, 5, 'x..x.'],
  [4, 4, 'xxxx'],
  [0, 4, '....'],
  [1, 4, 'x...'],
  [5, 8, 'x.x.xx.x'],
];

function cyclicGaps(pattern: boolean[]): number[] {
  const positions = pattern.flatMap((on, i) => (on ? [i] : []));
  return positions.map((p, i) => {
    const next = positions[(i + 1) % positions.length]!;
    return (next - p + pattern.length) % pattern.length || pattern.length;
  });
}

describe('euclideanRhythm', () => {
  it.each(exact)('spreads %i pulses over %i steps as %s', (pulses, steps, expected) => {
    expect(render(euclideanRhythm(pulses, steps))).toBe(expected);
  });

  it('keeps every pulse count and spaces pulses as evenly as possible (every span of consecutive gaps within one step), for all sizes up to 16', () => {
    for (let steps = 1; steps <= 16; steps++) {
      for (let pulses = 1; pulses <= steps; pulses++) {
        const pattern = euclideanRhythm(pulses, steps);
        expect(pattern).toHaveLength(steps);
        expect(pattern.filter(Boolean)).toHaveLength(pulses);
        const gaps = cyclicGaps(pattern);
        for (let span = 1; span < pulses; span++) {
          const sums = gaps.map((_, start) => {
            let total = 0;
            for (let k = 0; k < span; k++) total += gaps[(start + k) % gaps.length]!;
            return total;
          });
          expect(Math.max(...sums) - Math.min(...sums)).toBeLessThanOrEqual(1);
        }
      }
    }
  });
});
