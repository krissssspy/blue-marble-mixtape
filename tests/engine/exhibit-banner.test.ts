import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import {
  clearFramebuffer,
  createFramebuffer,
  type Framebuffer,
} from '../../src/engine/framebuffer.js';
import { drawExhibitBanner } from '../../src/engine/exhibit-banner.js';
import { findBitmapText, regionPixels, type PixelRegion } from './bitmap-text-region.js';

const topStrip = { left: 0, top: 0, right: 320, bottom: 44 };

function render(exhibitNumber: number, room: string, backing = 15): Framebuffer {
  const frame = createFramebuffer();
  clearFramebuffer(frame, backing);
  drawExhibitBanner(frame, exhibitNumber, room);
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

describe('orbital exhibit banner', () => {
  it.each([
    [1, 'Sea Level', 'f468d2a966a94e03032599b8a3d18b535be71306e36672f859abdc2feb638ea7'],
    [5, 'Greenhouse Gases', '55e3b9d5e2821cbe0307fa452ddc15713d6bc09be12ce80265c1f75eed251d0e'],
    [10, 'Lab', '6b14d82f219c980e6ff0af749e1c683f83911347cc57ae332a5d8421c4a8786c'],
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

    const marker = (x: number, y: number) => frame.pixels[y * frame.width + x];
    expect([marker(15, 14), marker(23, 19), marker(31, 25), marker(36, 19)]).toEqual([
      10, 11, 10, 4,
    ]);
  });
});
