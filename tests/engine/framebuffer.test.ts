import { describe, expect, it } from 'vitest';
import { clearFramebuffer, createFramebuffer, fillRect } from '../../src/engine/framebuffer.js';

describe('framebuffer', () => {
  it('starts with one zero palette index per pixel at 320×180', () => {
    const { width, height, pixels } = createFramebuffer();

    expect([width, height]).toEqual([320, 180]);
    expect(pixels).toBeInstanceOf(Uint8Array);
    expect(pixels).toHaveLength(320 * 180);
    expect(pixels.byteLength).toBe(320 * 180);
    expect(pixels.every((index) => index === 0)).toBe(true);
  });

  it('clears every pixel to the selected index without changing another framebuffer', () => {
    const frame = createFramebuffer();
    const other = createFramebuffer();

    clearFramebuffer(frame, 15);
    expect(frame.pixels.every((index) => index === 15)).toBe(true);
    expect(other.pixels.every((index) => index === 0)).toBe(true);

    clearFramebuffer(frame, 0);
    expect(frame.pixels.every((index) => index === 0)).toBe(true);
  });

  it('fills a rectangle in row-major order and preserves its neighbours', () => {
    const frame = createFramebuffer();
    clearFramebuffer(frame, 3);

    fillRect(frame, 5, 9, 3, 2, 12);

    const rowSlice = (y: number) => [...frame.pixels.slice(y * 320 + 4, y * 320 + 9)];
    expect(rowSlice(8)).toEqual([3, 3, 3, 3, 3]);
    expect(rowSlice(9)).toEqual([3, 12, 12, 12, 3]);
    expect(rowSlice(10)).toEqual([3, 12, 12, 12, 3]);
    expect(rowSlice(11)).toEqual([3, 3, 3, 3, 3]);
    expect(frame.pixels.filter((index) => index !== 3)).toEqual(new Uint8Array(6).fill(12));
  });

  it.each([
    ['upper left', -2, -1, [0, 1, 320, 321]],
    ['lower right', 318, 178, [57_278, 57_279, 57_598, 57_599]],
  ] as const)(
    'clips a rectangle across the %s corner without wrapping rows',
    (_label, x, y, expected) => {
      const frame = createFramebuffer();

      fillRect(frame, x, y, 4, 3, 7);

      const filled = Array.from(frame.pixels.entries()).filter(([, index]) => index !== 0);
      expect(filled).toEqual(expected.map((position) => [position, 7]));
    },
  );

  it.each([
    ['left of the screen', -4, 0, 4, 3],
    ['left of the screen with a gap', -5, 0, 4, 3],
    ['right of the screen', 320, 0, 4, 3],
    ['above the screen', 0, -3, 4, 3],
    ['below the screen', 0, 180, 4, 3],
    ['zero width', 4, 3, 0, 3],
    ['zero height', 4, 3, 4, 0],
  ] as const)('leaves the framebuffer unchanged (%s)', (_label, x, y, width, height) => {
    const frame = createFramebuffer();
    clearFramebuffer(frame, 3);

    fillRect(frame, x, y, width, height, 7);

    expect(frame.pixels.every((index) => index === 3)).toBe(true);
  });
});
