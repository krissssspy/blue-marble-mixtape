import sharp from 'sharp';
import { describe, expect, it } from 'vitest';
import { verifyListeningImage } from '../../tools/ingest/lib/image-dimensions.mjs';

function encodeImage(width: number, height: number, format: 'png' | 'jpeg' | 'webp') {
  return sharp({ create: { width, height, channels: 3, background: '#407a98' } })
    .toFormat(format)
    .toBuffer();
}

describe('verifyListeningImage', () => {
  it('preserves provenance but withholds the full-resolution URL when decoded width exceeds the limit', async () => {
    const url =
      'https://svs.gsfc.nasa.gov/images/gallery/EarthNowDashboard/WorldView_TrueColor.png';
    const image = { url, width: 2048, height: 4096 };
    const bytes = await encodeImage(4096, 2048, 'png');

    expect(await verifyListeningImage(image, bytes)).toEqual({
      originalImage: { url, width: 4096, height: 2048 },
      fullResolution: null,
    });
  });

  it('publishes the full-resolution URL at exactly 3840 decoded pixels wide', async () => {
    const url = 'https://svs.gsfc.nasa.gov/images/panorama.jpg';
    const image = { url, width: 4096, height: 1080 };
    const actual = { url, width: 3840, height: 120 };
    const bytes = await encodeImage(actual.width, actual.height, 'jpeg');

    expect(await verifyListeningImage(image, bytes)).toEqual({
      originalImage: actual,
      fullResolution: actual,
    });
  });

  it('rejects a non-JPEG/PNG image even when its URL ends in .png', async () => {
    const image = { url: 'https://svs.gsfc.nasa.gov/images/map.png', width: 32, height: 16 };
    const bytes = await encodeImage(32, 16, 'webp');

    await expect(verifyListeningImage(image, bytes)).rejects.toThrow(/JPEG|PNG|format/i);
  });

  it('rejects bytes that do not encode an image', async () => {
    const image = { url: 'https://svs.gsfc.nasa.gov/images/map.png', width: 32, height: 16 };

    await expect(verifyListeningImage(image, Buffer.from('not an image'))).rejects.toThrow();
  });
});
