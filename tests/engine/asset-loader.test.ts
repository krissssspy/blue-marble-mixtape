import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import {
  clearFramebuffer,
  createFramebuffer,
  type Framebuffer,
} from '../../src/engine/framebuffer.js';
import { drawAssetLoader } from '../../src/engine/asset-loader.js';
import { findBitmapText, regionPixels } from './bitmap-text-region.js';

const panel = { left: 170, top: 4, right: 310, bottom: 78 };

function render(progress: number, backing = 15): Framebuffer {
  const frame = createFramebuffer();
  clearFramebuffer(frame, backing);
  drawAssetLoader(frame, progress);
  return frame;
}

describe('observatory loader', () => {
  it.each([
    [0, '0a142d7b4a3d932098eed4012758f88d3f5b420d4419639e01fc38a07b076bd3'],
    [0.5, '4449b1d86b04dd31703dcbd052d7b89568fbd776db06fd849bc61b1746d21b54'],
    [1, '086568189be5093daf0d184c8d8e6758c41bfb6e30a519010a55f2dbdb6c2884'],
  ] as const)('matches the indexed loader frame at %s progress', (progress, expected) => {
    expect(createHash('sha256').update(render(progress, 2).pixels).digest('hex')).toBe(expected);
  });

  it('lights the panel from the top left and fills the inset progress track', () => {
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
    const label = findBitmapText(frame, status, panel);
    const digits = findBitmapText(frame, counter, panel);
    const alternateStatus = status === 'LOADING' ? 'READY' : 'LOADING';

    expect(label).toBeDefined();
    expect(digits).toBeDefined();
    expect(findBitmapText(frame, alternateStatus, panel)).toBeUndefined();
    for (const bounds of [label!, digits!]) {
      expect(regionPixels(frame, bounds)).toEqual(regionPixels(otherBackdrop, bounds));
    }
  });

  it('lights the scanner and progress track from left to right inside a fixed frame', () => {
    const stages = [0, 0.5, 1];
    const frames = stages.map((progress) => render(progress));
    const scanner = { left: 182, top: 37, right: 298, bottom: 64 };
    const signalPixels = frames.map(
      (frame) => regionPixels(frame, scanner).filter((pixel) => pixel === 10).length,
    );

    expect(signalPixels[0]).toBe(0);
    expect(signalPixels[1]).toBeGreaterThan(0);
    expect(signalPixels[2]).toBeGreaterThan(signalPixels[1]);
    expect(frames[1].pixels[46 * frames[1].width + 205]).toBe(10);
    expect(frames[1].pixels[46 * frames[1].width + 275]).toBe(3);
    for (const frame of frames) {
      expect(
        frame.pixels.every((pixel, offset) => {
          const x = offset % frame.width;
          const y = Math.floor(offset / frame.width);
          const inside = x >= panel.left && x < panel.right && y >= panel.top && y < panel.bottom;
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
    expect(render(-1).pixels).toEqual(frames[0].pixels);
    expect(render(0.5).pixels).toEqual(frames[1].pixels);
    expect(render(2).pixels).toEqual(frames[2].pixels);
  });
});
