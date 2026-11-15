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
    'ef83ed02e45a58274544dffc6d737c7df3b4b93604d4b02d52a241d7ca526ddf',
    '24dd7c2fa589285e3ab531b134561592fc9c4fca69edc4d94d0ac954fd7a4134',
  ],
  'air-quality': [
    '73637a2e5a9d635c46a72a27a719d6d6892045075ce1c0496f7e25717e89cfd7',
    'd9e91b4d838b386359d0f3a085f94b83742107090577651ca63249905c2545aa',
  ],
  biodiversity: [
    '1cf1d2742a0353f296001ebb5e36704981eb2c388bc8357e463563e2b160ddbc',
    'b01ddf6d0462db3705e555f7ab575677c47b12e1270aa3047efbab199785adf8',
  ],
  wildfires: [
    '113049629711043b5b0b778d7cf5c44f83dbfb88c2b8cc639a2a70abb4cc91e0',
    '033166666353941a11eb8c0eaa529443310827ac33b54d35431cd2e951ed09a6',
  ],
  'greenhouse-gases': [
    '5dc7f9335f01892d0c53c89c160018b6feb21d2a93d1cb67793c2e1335563eb1',
    '0f6e644d76d44df55faed711dae30eeab68cd6b235f36960de47acaa36eba53c',
  ],
  energy: [
    '04488f7b39336030ed239cdd91a3ed7692ecbc656e4ed0fca1c62ab0ee676fa3',
    '8646c363cd6066e515ab52267aae3022104381ddcff10a625b5561abaf18ea09',
  ],
  disasters: [
    'a4eaea65b456a36f89e4617db3e381b72fe25241288577f0ce7bcf262dc5a6b3',
    '95c12681f074e9995fd5beece0178b5ab9ea581c75d234555beae8a85944e64f',
  ],
  'water-resources': [
    '1b0ae35a9e076add22d4892592c465b37c4a0bae51bd47242c1c05ed2101097d',
    '3ed1fd1240116a301c772a2ba7fec55d491012563fd44c52d25de1bad4744640',
  ],
  agriculture: [
    'bccf0f477312803e2958e95d6a4d22d6f711541a37a9efe44fc8debc06240c47',
    'be8c59c515ef94cda5c88810bc5923b6dc3bdae84b86a488d0e00ad6061516cc',
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
