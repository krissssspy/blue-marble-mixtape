import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { assertBackgroundContrast, assertRoomMotifs } from '../../src/engine/background.js';
import {
  drawExhibitBackdrop,
  EXHIBIT_BACKGROUND_LAYERS,
} from '../../src/engine/exhibit-backgrounds.js';
import { createFramebuffer } from '../../src/engine/framebuffer.js';
import { DUSK_PALETTE } from '../../src/engine/palette.js';
import type { ExhibitId } from '../../src/exhibit-selection.js';

const exhibits = Object.keys(EXHIBIT_BACKGROUND_LAYERS) as ExhibitId[];

function render(exhibit: ExhibitId, camera: number, parallax: boolean) {
  const frame = createFramebuffer();
  frame.pixels.fill(15);
  drawExhibitBackdrop(frame, exhibit, camera, parallax);
  return frame.pixels;
}

describe('exhibit backdrops', () => {
  it('renders nine distinct scenes with four layers and ten named motifs each', () => {
    expect(exhibits).toHaveLength(9);
    assertRoomMotifs(
      exhibits.map((id) => ({
        id,
        layers: EXHIBIT_BACKGROUND_LAYERS[id].map(({ motifs }) => ({
          motifs: motifs.map(({ name }) => name),
        })),
      })),
    );
    for (const exhibit of exhibits) {
      expect(
        new Set(EXHIBIT_BACKGROUND_LAYERS[exhibit].map(({ parallax }) => parallax)).size,
      ).toBeGreaterThanOrEqual(4);
    }
    const hashes = exhibits.map((exhibit) =>
      createHash('sha256')
        .update(render(exhibit, 0, false))
        .digest('hex'),
    );
    expect(new Set(hashes).size).toBe(9);
  });

  it.each(exhibits)(
    'keeps %s muted, changes with camera parallax, and freezes when reduced',
    (exhibit) => {
      const still = render(exhibit, 0, false);
      const parallax = render(exhibit, 198, true);
      expect(render(exhibit, 198, false)).toEqual(still);
      expect(parallax).not.toEqual(still);
      const tones = [...new Set([...still, ...parallax])];
      expect(tones.length).toBeGreaterThanOrEqual(3);
      assertBackgroundContrast({
        backdrop: tones.map((index) => DUSK_PALETTE[index]),
        lane: [DUSK_PALETTE[12], DUSK_PALETTE[5]],
        text: [],
      });
    },
  );
});
