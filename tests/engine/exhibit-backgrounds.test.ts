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

const expectedFrames = {
  'sea-level': [
    '2887828ceb94b00ee2577191a869723df44a899ab0645b917b5e2c5fa13bb49c',
    'e1c69c2b99322353ea43ce5068c487860a43432d6a86588e18576d4c3d66d893',
  ],
  'air-quality': [
    'b232023125bd5fcd35e745f5e566950759e22e6de6125853382040d83414636c',
    '26f9672f1d83a72caf9715f8f118f0cd15b0c1db0da1704c66c2ff17a2a0844f',
  ],
  biodiversity: [
    '1ab8ce62c928ba486174b215d30244d9a72f16a6b442cafabef097496b6a60e5',
    '3cb3a006c5998ab486e49b1e4c2aa5952170cf0a4fd0fc7dc56c16386aca0718',
  ],
  wildfires: [
    '86d4cdf4fc3306364678dfed09b0261ed01e0f32e4c928abc1e221580d19e9ec',
    '23e24a767d76cbf3b3abf0ae87c615d7436a020af7be4c7106f0f0a54304f0a1',
  ],
  'greenhouse-gases': [
    'e3bdfa11ba33d8093c069289074fa101a57b249c98801e49c867f0bae85f21a0',
    '848c288cf54aa381c28fc0d373e97eff4b57fe68dbc410a1da7626a6c7d7b1c2',
  ],
  energy: [
    'caf1fbe92d02cedb6dbe9ccd59a04591e90551ea0549955e528f41de5dced1a4',
    '3d7d23a774a8e6413e88d3e46aba7ac622d06a485a99639197d6aa380a10b9c6',
  ],
  disasters: [
    'e057df628ae68328cd4beb0e6c14b0d179780371dfb8b6a8008bc3a08f7b5a6f',
    '0b6b629b0cdfcce51ea0944c16e3442bb42ed155f6963a684a489a4c9b3b9c24',
  ],
  'water-resources': [
    'a0a139d40bbb88c523ec796670724461acab5d6f344b42ce26ec25a081e29d55',
    'b12822f91963aee148ddca7242d0a7e836c474ed22a521d9b00ce6e74a6dc324',
  ],
  agriculture: [
    '7cfff8dbd3d23da4cb4b653120c73feb59f0eec4501c61c0772f6d7c6140438e',
    '005ddd1f0e9c144715c7f8a8189daaae2f8dd98e1d3503c6822ed5f6e8ef620d',
  ],
} as const;

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
      const digests = [still, parallax].map((pixels) =>
        createHash('sha256').update(pixels).digest('hex'),
      );
      expect(digests).toEqual(expectedFrames[exhibit]);
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
