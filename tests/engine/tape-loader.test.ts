import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import {
  clearFramebuffer,
  createFramebuffer,
  type Framebuffer,
} from '../../src/engine/framebuffer.js';
import { drawTapeLoader } from '../../src/engine/tape-loader.js';
import { findBitmapText, regionPixels, type PixelRegion } from './bitmap-text-region.js';

const cassette = { left: 170, top: 4, right: 310, bottom: 78 };
const leftReel = { left: 190, top: 37, right: 224, bottom: 67 };
const rightReel = { left: 260, top: 37, right: 294, bottom: 67 };

function render(progress: number, backing = 15): Framebuffer {
  const frame = createFramebuffer();
  clearFramebuffer(frame, backing);
  drawTapeLoader(frame, progress);
  return frame;
}

function tapeVolume(frames: readonly Framebuffer[], region: PixelRegion, emptyFrame: number) {
  const samples = frames.map((frame) => regionPixels(frame, region));
  const emptyPixels = samples[emptyFrame];
  const colors = new Set(emptyPixels);
  const background = [...colors].reduce((mostCommon, color) =>
    emptyPixels.filter((pixel) => pixel === color).length >
    emptyPixels.filter((pixel) => pixel === mostCommon).length
      ? color
      : mostCommon,
  );

  return samples.map((pixels) => pixels.filter((pixel) => pixel !== background).length);
}

describe('cassette tape loader', () => {
  it.each([
    [0, 'ab566146da0004b6456ad30f693654e993c5024a46d5dbb1b4b06701f4dd1a20'],
    [0.5, 'a65f9e909e48eaa941d270eeca9955314f02a17500fa2b2de3a342e472e6ddf6'],
    [1, '206faf159c04392551d1ff435d77feca9603f2e07353c6ed587fd463a3fc918b'],
  ] as const)('matches the indexed loader frame at %s progress', (progress, expected) => {
    expect(createHash('sha256').update(render(progress, 2).pixels).digest('hex')).toBe(expected);
  });

  it.each([
    [0, 'LOADING', '000'],
    [0.5, 'LOADING', '050'],
    [0.999, 'LOADING', '099'],
    [1, 'READY', '100'],
  ])('shows the correct status and counter at %s progress', (progress, status, counter) => {
    const frame = render(progress);
    const otherBackdrop = render(progress, 9);
    const label = findBitmapText(frame, status, cassette);
    const digits = findBitmapText(frame, counter, cassette);
    const alternateStatus = status === 'LOADING' ? 'READY' : 'LOADING';

    expect(label).toBeDefined();
    expect(digits).toBeDefined();
    expect(findBitmapText(frame, alternateStatus, cassette)).toBeUndefined();
    for (const bounds of [label!, digits!]) {
      expect(regionPixels(frame, bounds)).toEqual(regionPixels(otherBackdrop, bounds));
    }
  });

  it('transfers tape from the left reel to the right while the exterior stays fixed', () => {
    const stages = [0, 0.5, 1];
    const frames = stages.map((progress) => render(progress));
    const [leftStart, leftMid, leftEnd] = tapeVolume(frames, leftReel, 2);
    const [rightStart, rightMid, rightEnd] = tapeVolume(frames, rightReel, 0);

    expect(leftStart).toBeGreaterThan(leftMid);
    expect(leftMid).toBeGreaterThan(leftEnd);
    expect(rightStart).toBeLessThan(rightMid);
    expect(rightMid).toBeLessThan(rightEnd);
    for (const frame of frames) {
      expect(
        frame.pixels.every((pixel, offset) => {
          const x = offset % frame.width;
          const y = Math.floor(offset / frame.width);
          const inside =
            x >= cassette.left && x < cassette.right && y >= cassette.top && y < cassette.bottom;
          return inside || pixel === 15;
        }),
      ).toBe(true);
    }
    const opaqueFootprints = stages.map((progress, index) => {
      const other = render(progress, 9);
      return frames[index].pixels.map((pixel, offset) => Number(pixel === other.pixels[offset]));
    });
    expect(opaqueFootprints[1]).toEqual(opaqueFootprints[0]);
    expect(opaqueFootprints[2]).toEqual(opaqueFootprints[0]);
    expect(render(0.5).pixels).toEqual(frames[1].pixels);
  });
});
