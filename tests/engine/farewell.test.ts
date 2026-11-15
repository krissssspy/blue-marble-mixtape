import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { contrastRatio } from '../../src/engine/background.js';
import { drawFarewell } from '../../src/engine/farewell.js';
import { createFramebuffer } from '../../src/engine/framebuffer.js';
import { DUSK_PALETTE } from '../../src/engine/palette.js';
import { findBitmapText, regionPixels } from './bitmap-text-region.js';

describe('final thank-you screen', () => {
  it('thanks visitors in readable pixels and offers the same Down control to go back', () => {
    const frame = createFramebuffer();
    frame.pixels.fill(7);
    drawFarewell(frame);
    const pixel = (x: number, y: number) => frame.pixels[y * frame.width + x];
    expect([pixel(29, 31), pixel(237, 44), pixel(237, 71), pixel(42, 118)]).toEqual([11, 10, 4, 4]);
    expect(createHash('sha256').update(frame.pixels).digest('hex')).toBe(
      'd4980dc3bad63213ebe8ba129189fbc7fb19262923dd15f0fb2b8c4c0d4eff80',
    );
    expect(frame.pixels[0]).toBe(0);
    const panel = { left: 32, top: 48, right: 288, bottom: 147 };
    for (const label of ['THANKS FOR', 'VISITING', '↑ CREDITS', '↓ CLOSE']) {
      const region = findBitmapText(frame, label, panel);
      expect(region, label).toBeDefined();
      const colors = [...new Set(regionPixels(frame, region!))];
      expect(colors).toHaveLength(2);
      expect(
        contrastRatio(DUSK_PALETTE[colors[0]], DUSK_PALETTE[colors[1]]),
      ).toBeGreaterThanOrEqual(4.5);
    }
  });
});
