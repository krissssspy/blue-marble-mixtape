import { describe, expect, it } from 'vitest';
import { walkwayHeight } from '../../src/engine/walkway.js';

describe('walkwayHeight', () => {
  it('interpolates both directions on ramps and stays level on platforms', () => {
    const points = [
      { x: 10, y: 120 },
      { x: 30, y: 120 },
      { x: 50, y: 100 },
      { x: 70, y: 110 },
      { x: 80, y: 110 },
    ];

    expect(walkwayHeight(points, 25)).toBe(120);
    expect(walkwayHeight(points, 35)).toBe(115);
    expect(walkwayHeight(points, 50)).toBe(100);
    expect(walkwayHeight(points, 65)).toBe(107.5);
    expect(walkwayHeight(points, 75)).toBe(110);
  });

  it('takes the platform to the right at an exact vertical step', () => {
    const points = [
      { x: 10, y: 120 },
      { x: 30, y: 120 },
      { x: 30, y: 104 },
      { x: 55, y: 104 },
      { x: 55, y: 112 },
      { x: 80, y: 112 },
    ];

    expect(walkwayHeight(points, 29.75)).toBe(120);
    expect(walkwayHeight(points, 30)).toBe(104);
    expect(walkwayHeight(points, 30.25)).toBe(104);
    expect(walkwayHeight(points, 54.75)).toBe(104);
    expect(walkwayHeight(points, 55)).toBe(112);
    expect(walkwayHeight(points, 55.25)).toBe(112);
  });

  it('takes the right-hand height at a step at the first coordinate', () => {
    const points = [
      { x: 10, y: 120 },
      { x: 10, y: 104 },
      { x: 30, y: 104 },
    ];

    expect(walkwayHeight(points, 9.75)).toBe(120);
    expect(walkwayHeight(points, 10)).toBe(104);
  });

  it('holds the end heights when a position goes beyond the walkway', () => {
    const points = [
      { x: 10, y: 120 },
      { x: 30, y: 104 },
    ];

    expect(walkwayHeight(points, -10)).toBe(120);
    expect(walkwayHeight(points, 10)).toBe(120);
    expect(walkwayHeight(points, 30)).toBe(104);
    expect(walkwayHeight(points, 50)).toBe(104);
  });
});
