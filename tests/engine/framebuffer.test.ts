import { describe, expect, it } from 'vitest';
import { clearFramebuffer, createFramebuffer } from '../../src/engine/framebuffer.js';

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
});
