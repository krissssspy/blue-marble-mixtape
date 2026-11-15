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
    [0, '022c68cf09e5d1d9b4dc0e863510ea591a1f0588eb861cf1318e636c414b7ec3'],
    [0.5, '38b1ca7e2b84e580dfae196f68b2eb663766fb33d0abe252bc22c73679bd638e'],
    [1, '4b70285cb906d2ac60154090829db2796e423a7d01f82f807246a7818f48b137'],
  ] as const)('matches the indexed loader frame at %s progress', (progress, expected) => {
    expect(createHash('sha256').update(render(progress, 2).pixels).digest('hex')).toBe(expected);
  });

  it('lights the case from the top left and fills the inset progress track', () => {
    const frame = render(0.5);
    const at = (x: number, y: number) => frame.pixels[y * frame.width + x];
    expect([at(180, 8), at(174, 28), at(305, 28), at(180, 73)]).toEqual([11, 11, 2, 2]);
    expect([at(188, 69), at(239, 69), at(240, 69), at(291, 69)]).toEqual([10, 10, 3, 3]);
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
