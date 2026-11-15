import sharp from 'sharp';
import { describe, expect, it } from 'vitest';
import { extractColorGrid } from '../../tools/ingest/lib/color-grid.mjs';

describe('extractColorGrid', () => {
  it('samples the full image into row-major luminance, hue and saturation grids', async () => {
    const swatches = [
      { name: 'red', rgb: [255, 0, 0], expected: [54, 0, 255] },
      { name: 'green', rgb: [0, 255, 0], expected: [182, 85, 255] },
      { name: 'blue', rgb: [0, 0, 255], expected: [18, 170, 255] },
      { name: 'cyan', rgb: [0, 255, 255], expected: [201, 128, 255] },
      { name: 'magenta', rgb: [255, 0, 255], expected: [73, 213, 255] },
      { name: 'yellow', rgb: [255, 255, 0], expected: [237, 43, 255] },
      { name: 'muted green', rgb: [64, 192, 96], expected: [158, 96, 170] },
      { name: 'black', rgb: [0, 0, 0], expected: [0, 0, 0] },
      { name: 'gray', rgb: [128, 128, 128], expected: [128, 0, 0] },
      { name: 'white', rgb: [255, 255, 255], expected: [255, 0, 0] },
    ];
    const size = 12;
    const columns = 5;
    const channels = 3;
    const width = columns * size;
    const height = 2 * size;
    const rowOfSwatches = (row: number) =>
      Buffer.concat(
        swatches
          .slice(row * columns, (row + 1) * columns)
          .map(({ rgb }) => Buffer.alloc(size * channels, Buffer.from(rgb))),
      );
    const source = Buffer.concat([
      Buffer.alloc(size * width * channels, rowOfSwatches(0)),
      Buffer.alloc(size * width * channels, rowOfSwatches(1)),
    ]);
    const input = await sharp(source, { raw: { width, height, channels } }).png().toBuffer();

    const grid = await extractColorGrid(input);

    expect(grid).toMatchObject({ width: 96, height: 54 });
    for (const channel of [grid.luminance, grid.hue, grid.saturation]) {
      expect(channel).toBeInstanceOf(Uint8Array);
      expect(channel).toHaveLength(96 * 54);
    }
    const sampleColumns = [15, 29, 48, 67, 81];
    for (const [index, { name, expected }] of swatches.entries()) {
      const y = index < columns ? 1 : 52;
      const cell = y * 96 + sampleColumns[index % columns];
      expect([grid.luminance[cell], grid.hue[cell], grid.saturation[cell]], name).toEqual(expected);
    }
  });

  it('samples transparent, translucent and opaque pixels after compositing onto dark navy', async () => {
    const swatches = [
      { rgba: [255, 0, 0, 0], composited: [11, 16, 38], expected: [17, 162, 181] },
      { rgba: [255, 255, 255, 64], composited: [72, 75, 92], expected: [76, 164, 55] },
      { rgba: [100, 10, 200, 255], composited: [100, 10, 200], expected: [43, 190, 242] },
    ];
    const width = 96;
    const height = 54;
    const channels = 4;
    const swatchWidth = width / swatches.length;
    const row = Buffer.concat(
      swatches.map(({ rgba }) => Buffer.alloc(swatchWidth * channels, Buffer.from(rgba))),
    );
    const source = Buffer.alloc(width * height * channels, row);
    const input = await sharp(source, { raw: { width, height, channels } }).png().toBuffer();

    const grid = await extractColorGrid(input);

    for (const [index, { composited, expected }] of swatches.entries()) {
      const cell = 27 * width + index * swatchWidth + swatchWidth / 2;
      expect(
        [grid.luminance[cell], grid.hue[cell], grid.saturation[cell]],
        `RGB ${composited}`,
      ).toEqual(expected);
    }
  });
});
