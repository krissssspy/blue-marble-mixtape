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

function tapeChanges(before: Framebuffer, after: Framebuffer) {
  const counts = { left: 0, right: 0, leftReel: 0, rightReel: 0 };
  for (let y = 116; y < 170; y += 1) {
    for (let x = 0; x < before.width; x += 1) {
      const offset = y * before.width + x;
      if (before.pixels[offset] === after.pixels[offset]) continue;
      if (x < 45) counts.leftReel += 1;
      if (x >= 275) counts.rightReel += 1;
      if (x >= 45 && x < 160) counts.left += 1;
      if (x >= 160 && x < 275) counts.right += 1;
    }
  }
  return counts;
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

  it('advances the cassette tape from left to right and changes both reels with progress', () => {
    const [start, halfway, complete] = [0, 0.5, 1].map(render);
    const first = tapeChanges(start, halfway);
    const second = tapeChanges(halfway, complete);
    expect(first.left).toBeGreaterThan(first.right);
    expect(second.right).toBeGreaterThan(second.left);
    const whole = tapeChanges(start, complete);
    expect(whole.leftReel).toBeGreaterThan(0);
    expect(whole.rightReel).toBeGreaterThan(0);
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
