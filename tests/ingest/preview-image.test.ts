import { describe, expect, it } from 'vitest';
import { encodeListeningPreview } from '../../tools/ingest/lib/preview-image.mjs';

describe('encodeListeningPreview', () => {
  it.each([
    ['jpeg', 1600, 900, 1280, 720],
    ['png', 96, 128, 96, 128],
  ] as const)(
    'encodes a %s of %i × %i as WebP at %i × %i',
    async (format, width, height, expectedWidth, expectedHeight) => {
      const { default: sharp } = await import('sharp');
      const input = await sharp({ create: { width, height, channels: 3, background: '#407a98' } })
        .toFormat(format)
        .toBuffer();

      const preview = await encodeListeningPreview(input);

      expect(Buffer.isBuffer(preview)).toBe(true);
      expect(await sharp(preview).metadata()).toMatchObject({
        format: 'webp',
        width: expectedWidth,
        height: expectedHeight,
      });
    },
  );

  it('rejects malformed image bytes', async () => {
    await expect(encodeListeningPreview(Buffer.from('invalid image'))).rejects.toThrow();
  });
});
