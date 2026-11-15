import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { selectListeningImage } from '../../tools/ingest/lib/listening-image.mjs';
import { selectViews } from '../../tools/ingest/lib/views.mjs';

function image(filename: string, width: number, height: number, host = 'svs.gsfc.nasa.gov') {
  return { filename, url: `http://${host}/images/${filename}`, width, height, media_type: 'Image' };
}

describe('selectListeningImage', () => {
  it('uses the published 1920-pixel variant when the recorded 5760-pixel variant is too wide', () => {
    const page = JSON.parse(
      readFileSync(new URL('../fixtures/svs/5533.json', import.meta.url), 'utf8'),
    );
    const [view] = selectViews({ mainImage: page.main_image, mediaGroups: page.media_groups });

    expect(selectListeningImage(view)).toMatchObject({
      id: 1154743,
      url: 'https://svs.gsfc.nasa.gov/vis/a000000/a005500/a005533/AirQuality_Sphere_1920x1080_0000.png',
      width: 1920,
      height: 1080,
    });
  });

  it('accepts the exact width limit and skips wider, unsupported, invalid, and offsite variants', () => {
    const original = image('map.JPEG', 3840, 2160);
    const imageVariants = [
      image('smaller.png', 1920, 1080),
      image('oversized.jpg', 3841, 2160),
      image('source.tiff', 3840, 4000),
      image('outside.png', 3840, 4000, 'example.test'),
      image('empty.png', 3840, 0),
      image('invalid.png', 3840, Infinity),
      original,
    ];

    expect(selectListeningImage({ imageVariants })).toEqual({
      ...original,
      url: 'https://svs.gsfc.nasa.gov/images/map.JPEG',
    });
  });

  it('ranks by pixel area and keeps the first variant on ties', () => {
    const first = image('first.png', 3000, 2000);
    const imageVariants = [image('wider.jpg', 3840, 1000), first, image('equal.jpg', 2000, 3000)];

    expect(selectListeningImage({ imageVariants })).toMatchObject({
      filename: first.filename,
      width: 3000,
      height: 2000,
    });
  });

  it.each(['map.jpg', 'map.PNG'])('accepts %s when already served over HTTPS', (filename) => {
    const original = {
      ...image(filename, 3840, 2160),
      url: `https://svs.gsfc.nasa.gov/images/${filename}`,
    };
    expect(selectListeningImage({ imageVariants: [original] })).toEqual(original);
  });

  it.each([
    ['a malformed URL', 'not a URL'],
    ['a username', 'https://user@svs.gsfc.nasa.gov/images/map.png'],
    ['a password without a username', 'https://:secret@svs.gsfc.nasa.gov/images/map.png'],
    ['a trusted hostname in user info', 'https://svs.gsfc.nasa.gov@outside.test/images/map.png'],
    ['FTP on the NASA host', 'ftp://svs.gsfc.nasa.gov/images/map.png'],
    ['an executable suffix', 'https://svs.gsfc.nasa.gov/images/map.png.exe'],
  ])('rejects %s', (_label, url) => {
    expect(
      selectListeningImage({ imageVariants: [{ ...image('map.png', 3840, 2160), url }] }),
    ).toBeNull();
  });

  it.each([
    ['infinite width', Infinity, 2160],
    ['NaN width', NaN, 2160],
    ['zero width', 0, 2160],
    ['zero height', 3840, 0],
  ])('rejects a variant with %s', (_label, width, height) => {
    expect(selectListeningImage({ imageVariants: [image('map.png', width, height)] })).toBeNull();
  });

  it('returns null when no published variant qualifies', () => {
    expect(
      selectListeningImage({
        imageVariants: [image('empty.png', 0, 1080), image('wide.png', 3841, 1080)],
      }),
    ).toBeNull();
  });
});
