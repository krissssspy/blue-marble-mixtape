import sharp from 'sharp';
import { describe, expect, it } from 'vitest';
import { encodeThumbnail } from '../../tools/ingest/lib/thumbnail.mjs';

const duskPalette = new Set([
  '0b1026',
  '121a36',
  '16213e',
  '1c2f55',
  '24406e',
  'f4f1de',
  'ffcc33',
  'ff6b6b',
  '3fa66a',
  '2b7a4b',
  '2ec4b6',
  '9bf6ff',
  '6f82a8',
  '5a3e2b',
  'a0673a',
  'f2c79a',
]);

describe('encodeThumbnail', () => {
  it('encodes a 48×27 PNG with centered navy padding and Dusk palette pixels', async () => {
    const width = 40;
    const height = 60;
    const channels = 3;
    const source = Buffer.alloc(width * height * channels);
    const lowerHalf = source.length / 2;
    source.fill(Buffer.from('faca35', 'hex'), 0, lowerHalf);
    source.fill(Buffer.from('fc6f69', 'hex'), lowerHalf);
    const input = await sharp(source, { raw: { width, height, channels } }).png().toBuffer();

    const thumbnail = await encodeThumbnail(input);

    expect(Buffer.isBuffer(thumbnail)).toBe(true);
    expect(await sharp(thumbnail).metadata()).toMatchObject({
      format: 'png',
      width: 48,
      height: 27,
    });
    const { data, info } = await sharp(thumbnail)
      .removeAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    const pixel = (x: number, y: number) => {
      const start = (y * info.width + x) * info.channels;
      return data.toString('hex', start, start + info.channels);
    };

    expect([pixel(14, 5), pixel(15, 5), pixel(32, 5), pixel(33, 5)]).toEqual([
      '0b1026',
      'ffcc33',
      'ffcc33',
      '0b1026',
    ]);
    expect(pixel(24, 21)).toBe('ff6b6b');

    const outsidePalette = new Set<string>();
    for (let start = 0; start < data.length; start += info.channels) {
      const color = data.toString('hex', start, start + info.channels);
      if (!duskPalette.has(color)) outsidePalette.add(color);
    }
    expect([...outsidePalette]).toEqual([]);
  });

  it('composites transparent and partially opaque pixels onto navy before choosing Dusk colors', async () => {
    const width = 48;
    const height = 27;
    const sourceRow = Buffer.concat([
      Buffer.alloc(16 * 4, Buffer.from('ffcc3300', 'hex')),
      Buffer.alloc(16 * 4, Buffer.from('ffffff40', 'hex')),
      Buffer.alloc(16 * 4, Buffer.from('faca35ff', 'hex')),
    ]);
    const source = Buffer.alloc(width * height * 4, sourceRow);
    const input = await sharp(source, { raw: { width, height, channels: 4 } })
      .png()
      .toBuffer();

    const thumbnail = await encodeThumbnail(input);

    expect(await sharp(thumbnail).metadata()).toMatchObject({ channels: 3, hasAlpha: false });
    const rgb = await sharp(thumbnail).raw().toBuffer();
    const expectedRow = Buffer.concat([
      Buffer.alloc(16 * 3, Buffer.from('0b1026', 'hex')),
      Buffer.alloc(16 * 3, Buffer.from('24406e', 'hex')),
      Buffer.alloc(16 * 3, Buffer.from('ffcc33', 'hex')),
    ]);
    expect(rgb).toEqual(Buffer.alloc(width * height * 3, expectedRow));
  });

  it('preserves every exact Dusk color in the RGB output', async () => {
    const width = 48;
    const height = 27;
    const channels = 3;
    const paletteRow = Buffer.concat(
      Array.from(duskPalette, (color) => Buffer.alloc(3 * channels, Buffer.from(color, 'hex'))),
    );
    const source = Buffer.alloc(width * height * channels, paletteRow);
    const input = await sharp(source, { raw: { width, height, channels } }).png().toBuffer();

    const thumbnail = await encodeThumbnail(input);

    expect(await sharp(thumbnail).raw().toBuffer()).toEqual(source);
  });
});
