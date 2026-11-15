import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { contrastRatio } from '../../src/engine/background.js';
import { writeFrameRgba } from '../../src/engine/display.js';
import {
  clearFramebuffer,
  createFramebuffer,
  type Framebuffer,
} from '../../src/engine/framebuffer.js';
import { drawListeningOverlay } from '../../src/engine/listening-overlay.js';
import { DUSK_PALETTE } from '../../src/engine/palette.js';
import { findBitmapText, regionPixels } from './bitmap-text-region.js';

const metadata = {
  shortTitle: 'Arctic Sea Ice',
  displayDate: '2025-02-27',
  genre: 'ambient',
};
const view = { left: 0, top: 0, right: 320, bottom: 180 };
const imageCenter = { left: 140, top: 65, right: 180, bottom: 115 };

function render(progress: number): Framebuffer {
  const frame = createFramebuffer();
  clearFramebuffer(frame, 255);
  drawListeningOverlay(frame, metadata, progress);
  return frame;
}

describe('listening overlay', () => {
  it('renders the title, human-readable date, genre, and close hint on opaque readable panels', () => {
    const frame = render(0.5);

    for (const label of ['ARCTIC SEA ICE', '27 FEB 2025', 'AMBIENT', '↓ CLOSE']) {
      const bounds = findBitmapText(frame, label, view);
      expect(bounds, label).toBeDefined();
      const panel = regionPixels(frame, bounds!);
      const backing = panel.find((pixel) => pixel < 5)!;
      const ink = panel.find((pixel) => pixel >= 5)!;
      expect(contrastRatio(DUSK_PALETTE[ink], DUSK_PALETTE[backing]), label).toBeGreaterThanOrEqual(
        4.5,
      );
    }

    expect(regionPixels(frame, imageCenter).every((pixel) => pixel === 255)).toBe(true);
  });

  it('moves the timeline cursor across the signal and keeps the image center clear', () => {
    const [start, halfway, complete] = [0, 0.5, 1].map(render);
    const frameSequence = createHash('sha256');
    for (const { pixels } of [start, halfway, complete]) frameSequence.update(pixels);
    expect(frameSequence.digest('hex')).toBe(
      '77dfe0cd4364dc5da112054eb687fae7b7070004b74d2153657d2fafd346975b',
    );
    const pixel = (frame: Framebuffer, x: number, y: number) => frame.pixels[y * frame.width + x];
    expect([pixel(start, 27, 154), pixel(halfway, 160, 154), pixel(complete, 292, 154)]).toEqual([
      11, 11, 11,
    ]);
    expect([pixel(start, 134, 159), pixel(halfway, 134, 159), pixel(complete, 260, 159)]).toEqual([
      4, 10, 10,
    ]);
    expect(pixel(halfway, 253, 159)).toBe(4);
    expect(render(-1).pixels).toEqual(start.pixels);
    expect(render(2).pixels).toEqual(complete.pixels);
    expect(render(0.5).pixels).toEqual(halfway.pixels);
  });

  it('blits untouched image pixels transparently and keeps every Dusk index opaque', () => {
    const frame = render(0.5);
    for (let index = 0; index < 16; index += 1)
      frame.pixels[100 * frame.width + 145 + index] = index;
    const rgba = new Uint8ClampedArray(frame.pixels.length * 4).fill(127);

    writeFrameRgba(frame, rgba);

    const actualAlpha = frame.pixels.map((_, index) => rgba[index * 4 + 3]);
    const expectedAlpha = frame.pixels.map((index) => (index === 255 ? 0 : 255));
    expect(actualAlpha).toEqual(expectedAlpha);
  });
});
