import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import {
  clearFramebuffer,
  createFramebuffer,
  type Framebuffer,
} from '../../src/engine/framebuffer.js';
import { drawTrackBanner } from '../../src/engine/track-banner.js';
import { findBitmapText, regionPixels, type PixelRegion } from './bitmap-text-region.js';

const topStrip = { left: 0, top: 0, right: 320, bottom: 44 };

function render(track: number, room: string, backing = 15): Framebuffer {
  const frame = createFramebuffer();
  clearFramebuffer(frame, backing);
  drawTrackBanner(frame, track, room);
  return frame;
}

function bounds(frame: Framebuffer, backing: number): PixelRegion {
  const offsets = [...frame.pixels.keys()].filter((offset) => frame.pixels[offset] !== backing);
  const xs = offsets.map((offset) => offset % frame.width);
  const ys = offsets.map((offset) => Math.floor(offset / frame.width));
  return {
    left: Math.min(...xs),
    top: Math.min(...ys),
    right: Math.max(...xs) + 1,
    bottom: Math.max(...ys) + 1,
  };
}

function hasTapeHubs(frame: Framebuffer, icon: PixelRegion): boolean {
  for (let y = icon.top; y < icon.bottom; y += 1) {
    let lightRuns = 0;
    let light = false;
    for (let x = icon.left; x < icon.right; x += 1) {
      const next = frame.pixels[y * frame.width + x] >= 5;
      if (next && !light) lightRuns += 1;
      light = next;
    }
    if (lightRuns === 2) return true;
  }
  return false;
}

describe('cassette track banner', () => {
  it.each([
    [1, 'Sea Level', 'be0d74a64d7b81707bdb81087d54479781921ab27087a9e33adb9fab7c496e95'],
    [5, 'Greenhouse Gases', 'becd6ead6f8d6bce25f2e488c7e602ed43da08429c6cb31d7e679e6e9c2ae789'],
    [10, 'Lab', '11c639f953d29daf4d7da5dc436dd2db84d812b9f094ccc3f3c205c2d6612fed'],
  ] as const)('matches the indexed banner for track %i', (track, room, expected) => {
    const frame = render(track, room, 2);
    expect(createHash('sha256').update(frame.pixels).digest('hex')).toBe(expected);
  });

  it.each([
    [1, 'Sea Level', '1 SEA LEVEL'],
    [10, 'Lab', '10 LAB'],
    [5, 'Greenhouse Gases', '5 GREENHOUSE GASES'],
  ])('shows the entire label for track %i', (track, room, label) => {
    const frame = render(track, room);
    const badge = bounds(frame, 15);
    const text = findBitmapText(frame, label, topStrip);

    expect(text).toBeDefined();
    expect(badge.left).toBeLessThan(16);
    expect(badge.top).toBeLessThan(16);
    expect(badge.bottom).toBeLessThanOrEqual(topStrip.bottom);
    expect(text!.right).toBeLessThan(badge.right);
    expect(text!.left).toBeGreaterThan(badge.left + 8);
    expect(regionPixels(frame, text!)).toEqual(regionPixels(render(track, room, 9), text!));

    expect(
      hasTapeHubs(frame, {
        left: badge.left + 2,
        top: badge.top + 2,
        right: text!.left - 1,
        bottom: badge.bottom - 2,
      }),
    ).toBe(true);
  });
});
