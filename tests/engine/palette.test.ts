import sharp from 'sharp';
import { describe, expect, it } from 'vitest';
import { BACKDROP_RAMP, DUSK_PALETTE } from '../../src/engine/palette.js';
import { encodeThumbnail } from '../../tools/ingest/lib/thumbnail.mjs';

describe('Dusk palette', () => {
  it('keeps the canonical colors in palette index order and the five backdrop tones', () => {
    expect(DUSK_PALETTE).toEqual([
      '#0b1026',
      '#121a36',
      '#16213e',
      '#1c2f55',
      '#24406e',
      '#f4f1de',
      '#ffcc33',
      '#ff6b6b',
      '#3fa66a',
      '#2b7a4b',
      '#2ec4b6',
      '#9bf6ff',
      '#6f82a8',
      '#5a3e2b',
      '#a0673a',
      '#f2c79a',
    ]);
    expect(BACKDROP_RAMP).toEqual(['#0b1026', '#121a36', '#16213e', '#1c2f55', '#24406e']);
  });

  it('preserves every renderer palette color in a generated ingest thumbnail', async () => {
    const width = 48;
    const height = 27;
    const channels = 3;
    const row = Buffer.concat(
      DUSK_PALETTE.map((color) => Buffer.alloc(3 * channels, Buffer.from(color.slice(1), 'hex'))),
    );
    const swatches = Buffer.alloc(width * height * channels, row);
    const input = await sharp(swatches, { raw: { width, height, channels } }).png().toBuffer();

    const output = await encodeThumbnail(input);

    expect(await sharp(output).raw().toBuffer()).toEqual(swatches);
  });
});
