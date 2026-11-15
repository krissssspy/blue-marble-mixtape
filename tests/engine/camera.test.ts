import { describe, expect, it } from 'vitest';
import { cameraLeft } from '../../src/engine/camera.js';

describe('cameraLeft', () => {
  it('keeps the explorer centered while the full viewport fits in the room', () => {
    expect(cameraLeft(300, 640)).toBe(140);
    expect(cameraLeft(510, 850)).toBe(350);
  });

  it('clamps the viewport at the left and right room edges', () => {
    expect(cameraLeft(30, 850)).toBe(0);
    expect(cameraLeft(750, 850)).toBe(530);
  });

  it('keeps the camera at zero for rooms no wider than the 320-pixel viewport', () => {
    expect(cameraLeft(300, 320)).toBe(0);
    expect(cameraLeft(180, 240)).toBe(0);
  });
});
