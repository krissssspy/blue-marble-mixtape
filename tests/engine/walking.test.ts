import { describe, expect, it } from 'vitest';
import { walkPosition } from '../../src/engine/walking.js';

const bounds = { minX: 12, maxX: 242 };
const left = { left: true, right: false };
const right = { left: false, right: true };

describe('walkPosition', () => {
  it('moves left or right at 96 pixels per second', () => {
    expect(walkPosition(110, left, bounds, 0.5)).toBe(62);
    expect(walkPosition(110, right, bounds, 0.5)).toBe(158);
  });

  it('advances by the same fractional distance on each 60 Hz tick', () => {
    let x = 110;
    for (let tick = 1; tick <= 4; tick += 1) {
      x = walkPosition(x, right, bounds, 1 / 60);
      expect(x).toBeCloseTo(110 + 1.6 * tick);
    }
  });

  it('holds position when both directions are pressed or neither is held', () => {
    expect(walkPosition(110, { left: true, right: true }, bounds, 1 / 60)).toBe(110);
    expect(walkPosition(110, { left: false, right: false }, bounds, 1 / 60)).toBe(110);
  });

  it('stops at either walkway end when a step would overshoot', () => {
    expect(walkPosition(13, left, bounds, 1 / 60)).toBe(bounds.minX);
    expect(walkPosition(241, right, bounds, 1 / 60)).toBe(bounds.maxX);
  });
});
