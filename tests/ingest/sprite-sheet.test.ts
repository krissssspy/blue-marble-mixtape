import sharp from 'sharp';
import { describe, expect, it, vi } from 'vitest';
import { encodeSpriteSheet } from '../../tools/ingest/lib/sprite-sheet.mjs';

const columns = 8;
const rows = 6;
const frameWidth = 320;
const frameHeight = 180;
const frameBytes = frameWidth * frameHeight * 3;
const maxBytes = 2_000_000;

describe('encodeSpriteSheet', () => {
  it('encodes 48 frames in row-major order in one 2560×1080 WebP', async () => {
    const colors = Array.from({ length: columns * rows }, (_, index) => [
      32 + (index % 4) * 56,
      32 + (Math.floor(index / 4) % 4) * 56,
      32 + Math.floor(index / 16) * 80,
    ]);
    const frames = colors.map((color) => Buffer.alloc(frameBytes, Buffer.from(color)));
    const topBand = [208, 160, 96];
    frames[0].fill(Buffer.from(topBand), 0, frameBytes / 3);

    const sheet = await encodeSpriteSheet(frames);

    expect(Buffer.isBuffer(sheet)).toBe(true);
    expect(sheet.length).toBeLessThanOrEqual(maxBytes);
    expect(await sharp(sheet).metadata()).toMatchObject({
      format: 'webp',
      width: 2560,
      height: 1080,
    });
    const { data, info } = await sharp(sheet)
      .removeAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    for (const [index, expected] of colors.entries()) {
      const x = (index % columns) * frameWidth + frameWidth / 2;
      const y = Math.floor(index / columns) * frameHeight + frameHeight / 2;
      const offset = (y * info.width + x) * info.channels;
      const actual = data.subarray(offset, offset + 3);
      expect(
        Math.max(...expected.map((value, channel) => Math.abs(value - actual[channel]))),
        `center RGB of frame ${index}`,
      ).toBeLessThanOrEqual(12);
    }
    const topBandOffset = (30 * info.width + frameWidth / 2) * info.channels;
    const topBandPixel = data.subarray(topBandOffset, topBandOffset + 3);
    expect(
      Math.max(...topBand.map((value, channel) => Math.abs(value - topBandPixel[channel]))),
      'top band RGB of frame 0',
    ).toBeLessThanOrEqual(12);
  });

  it('keeps a high-detail sheet within the two-megabyte limit', async () => {
    let state = 123456789;
    const frames = Array.from({ length: columns * rows }, () => {
      const frame = Buffer.alloc(frameBytes);
      for (let offset = 0; offset < frame.length; offset++) {
        state ^= state << 13;
        state ^= state >>> 17;
        state ^= state << 5;
        frame[offset] = state & 0xff;
      }
      return frame;
    });

    const sheet = await encodeSpriteSheet(frames);

    expect(sheet.length).toBeLessThanOrEqual(maxBytes);
    expect(await sharp(sheet).metadata()).toMatchObject({
      format: 'webp',
      width: 2560,
      height: 1080,
    });
  }, 20_000);

  it.each([47, 49])('rejects a set of %i frames', async (count) => {
    const frame = Buffer.alloc(frameBytes);
    const frames = Array.from({ length: count }, () => frame);

    await expect(encodeSpriteSheet(frames)).rejects.toThrow(/48/);
  });

  it('rejects a frame with a truncated RGB buffer', async () => {
    const frame = Buffer.alloc(frameBytes);
    const frames = Array.from({ length: columns * rows }, () => frame);
    frames[20] = Buffer.alloc(frameBytes - 1);

    await expect(encodeSpriteSheet(frames)).rejects.toThrow(/frame|byte/i);
  });

  it('rejects a non-Buffer frame even when its length is correct', async () => {
    const frame = Buffer.alloc(frameBytes);
    const frames = Array.from({ length: columns * rows }, (_, index) =>
      index === 20 ? new Uint8Array(frameBytes) : frame,
    );

    await expect(encodeSpriteSheet(frames)).rejects.toThrow(/RGB bytes for sprite frame 21/);
  });

  it('accepts the exact byte limit and rejects a sheet one byte larger', async () => {
    const frame = Buffer.alloc(frameBytes);
    const frames = Array.from({ length: columns * rows }, () => frame);
    const atLimit = Buffer.alloc(maxBytes);
    const toBuffer = vi.spyOn(sharp.prototype, 'toBuffer');
    try {
      toBuffer.mockResolvedValueOnce(atLimit).mockResolvedValueOnce(Buffer.alloc(maxBytes + 1));

      await expect(encodeSpriteSheet(frames)).resolves.toBe(atLimit);
      await expect(encodeSpriteSheet(frames)).rejects.toThrow(
        'Sprite sheet exceeds the 2000000-byte limit (2000001 bytes).',
      );
    } finally {
      toBuffer.mockRestore();
    }
  });
});
