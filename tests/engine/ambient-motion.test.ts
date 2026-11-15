import { describe, expect, it } from 'vitest';
import { assertAmbientMotion } from '../../src/engine/ambient-motion.js';

function pixels(count: number, start = 0) {
  return Array.from({ length: count }, (_, index) => {
    const offset = start + index;
    return { x: offset % 320, y: Math.floor(offset / 320) };
  });
}

describe('ambient motion', () => {
  it('allows up to three animations with under two percent of the screen changed per update', () => {
    const firstChange = [...pixels(1151), { x: 0, y: 0 }];
    const secondChange = pixels(1151, 320 * 4);

    expect(() =>
      assertAmbientMotion(
        [
          { intervalMs: 1000, changes: [firstChange, secondChange] },
          { intervalMs: 1000, changes: [pixels(1)] },
          { intervalMs: 1500, changes: [pixels(2)] },
        ],
        [],
      ),
    ).not.toThrow();
  });

  it('rejects four animations even when all the individual changes are allowed', () => {
    const animations = Array.from({ length: 4 }, (_, index) => ({
      intervalMs: 1000,
      changes: [pixels(1, index)],
    }));

    expect(() => assertAmbientMotion(animations, [])).toThrow();
  });

  it('rejects an animation that changes more often than once per second', () => {
    expect(() =>
      assertAmbientMotion(
        [
          { intervalMs: 1000, changes: [pixels(1)] },
          { intervalMs: 999, changes: [pixels(1)] },
        ],
        [],
      ),
    ).toThrow();
  });

  it('rejects a change that touches exactly two percent of the screen', () => {
    expect(() =>
      assertAmbientMotion([{ intervalMs: 1000, changes: [pixels(1), pixels(1152)] }], []),
    ).toThrow();
  });

  it('allows changes adjacent to the outside edges of protected areas', () => {
    const areas = [{ x: 10, y: 10, width: 6, height: 4 }];
    const adjacent = [
      { x: 9, y: 10 },
      { x: 10, y: 9 },
      { x: 16, y: 10 },
      { x: 10, y: 14 },
    ];

    expect(() =>
      assertAmbientMotion([{ intervalMs: 1000, changes: [adjacent] }], areas),
    ).not.toThrow();
  });

  it.each([
    { x: 10, y: 10 },
    { x: 15, y: 13 },
  ])('rejects a changed pixel at $x,$y inside a protected area', (point) => {
    const areas = [
      { x: 100, y: 100, width: 6, height: 4 },
      { x: 10, y: 10, width: 6, height: 4 },
    ];

    expect(() =>
      assertAmbientMotion([{ intervalMs: 1000, changes: [pixels(1), [point]] }], areas),
    ).toThrow();
  });
});
