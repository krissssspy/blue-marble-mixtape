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
    expect(createHash('sha256').update(frame.pixels).digest('hex')).toBe(
      '311902ef5804fc92471815ca374f672d7650cb9d1da9e07049daf505340dfae9',
    );
    expect(frame.pixels[0]).toBe(0);
    const panel = { left: 32, top: 48, right: 288, bottom: 138 };
    for (const label of ['THANKS FOR', 'VISITING', '↓ CLOSE']) {
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
