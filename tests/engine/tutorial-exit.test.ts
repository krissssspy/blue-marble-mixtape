import { describe, expect, it } from 'vitest';
import { tutorialExitOpen } from '../../src/engine/room-travel.js';

describe('the tutorial exit', () => {
  it.each([0, 0.5, 0.999])('stays closed at load progress %f', (progress) => {
    expect(tutorialExitOpen(progress)).toBe(false);
  });

  it('opens once progress reaches one', () => {
    expect(tutorialExitOpen(1)).toBe(true);
  });
});
