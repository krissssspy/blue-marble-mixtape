import { describe, expect, it } from 'vitest';
import { motionFrame } from '../../src/engine/motion-preference.js';

describe('motionFrame', () => {
  it('keeps the live background, sparkles, and parallax with standard motion', () => {
    expect(motionFrame(30, false)).toMatchObject({
      backgroundTick: 30,
      sparkles: true,
      parallax: true,
    });
    expect(motionFrame(120, false).backgroundTick).toBe(120);
  });

  it('freezes the background and disables sparkles and parallax with reduced motion', () => {
    for (const tick of [0, 60, 120]) {
      expect(motionFrame(tick, true)).toMatchObject({
        backgroundTick: 0,
        sparkles: false,
        parallax: false,
      });
    }
  });

  it('keeps an oscillating focus pulse that changes every 60 ticks rather than every 15', () => {
    const normalStart = motionFrame(0, false).pulse;
    expect(normalStart).toBeDefined();
    expect(motionFrame(14, false).pulse).toBe(normalStart);
    expect(motionFrame(15, false).pulse).not.toBe(normalStart);
    expect(motionFrame(30, false).pulse).toBe(normalStart);

    const reducedStart = motionFrame(0, true).pulse;
    expect(reducedStart).toBeDefined();
    expect(motionFrame(15, true).pulse).toBe(reducedStart);
    expect(motionFrame(59, true).pulse).toBe(reducedStart);
    expect(motionFrame(60, true).pulse).not.toBe(reducedStart);
    expect(motionFrame(120, true).pulse).toBe(reducedStart);
  });
});
