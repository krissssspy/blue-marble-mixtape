import { describe, expect, it } from 'vitest';
import { writeFrameRgba } from '../../src/engine/display.js';
import { createFramebuffer } from '../../src/engine/framebuffer.js';

describe('writeFrameRgba', () => {
  it('expands a frame to opaque RGBA in row order without changing its indices', () => {
    const frame = createFramebuffer();
    const lastPixel = frame.pixels.length - 1;
    frame.pixels[0] = 6;
    frame.pixels[319] = 15;
    frame.pixels[320] = 7;
    frame.pixels[lastPixel] = 5;
    const sourceBefore = frame.pixels.slice();
    const target = new Uint8ClampedArray(frame.pixels.length * 4).fill(17);
    const expected = Buffer.alloc(target.length, Buffer.from([11, 16, 38, 255]));
    expected.set([255, 204, 51, 255], 0);
    expected.set([242, 199, 154, 255], 319 * 4);
    expected.set([255, 107, 107, 255], 320 * 4);
    expected.set([244, 241, 222, 255], lastPixel * 4);

    writeFrameRgba(frame, target);

    expect(Buffer.from(target).equals(expected)).toBe(true);
    expect(frame.pixels).toEqual(sourceBefore);

    frame.pixels[319] = 0;
    sourceBefore[319] = 0;
    target[target.length - 1] = 17;
    expected.set([11, 16, 38, 255], 319 * 4);

    writeFrameRgba(frame, target);

    expect(Buffer.from(target).equals(expected)).toBe(true);
    expect(frame.pixels).toEqual(sourceBefore);
  });
});
