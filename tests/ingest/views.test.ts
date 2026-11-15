import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { selectViews } from '../../tools/ingest/lib/views.mjs';

function readRecordedPage(id: number) {
  return JSON.parse(readFileSync(new URL(`../fixtures/svs/${id}.json`, import.meta.url), 'utf8'));
}

describe('selectViews', () => {
  it('keeps the recorded main image and selects just the next two distinct views in source order', () => {
    const page = readRecordedPage(5533);
    const views = selectViews({ mainImage: page.main_image, mediaGroups: page.media_groups });

    expect(views.map(({ groupId }) => groupId)).toEqual([378003, 378004, 378005]);
    expect(views[0].image).toEqual(page.main_image);
    expect(views[0].imageVariants.map(({ id }: { id: number }) => id)).toEqual([1154742, 1154743]);
  });

  it('puts a main image from a later group first without selecting that group again', () => {
    const images = [101, 102, 103].map((id) => ({
      id,
      url: `https://svs.gsfc.nasa.gov/images/${id}.png`,
      filename: `${id}.png`,
      media_type: 'Image',
      width: 960,
      height: 540,
    }));
    const mediaGroups = images.map((instance, index) => ({
      id: index + 1,
      widget: 'Image gallery',
      items: [{ type: 'media', instance }],
    }));

    const emptyItems = [null, { type: 'media', instance: null }];
    const views = selectViews({
      mainImage: { ...images[1] },
      mediaGroups: [
        { id: 0, widget: 'Image gallery', items: emptyItems },
        { ...mediaGroups[0], items: [...emptyItems, ...mediaGroups[0].items] },
        ...mediaGroups.slice(1),
      ],
    });

    expect(views.map(({ groupId }) => groupId)).toEqual([2, 1, 3]);
    expect(views.map(({ image }) => image)).toEqual([images[1], images[0], images[2]]);
    expect(views.map(({ imageVariants }) => imageVariants)).toEqual([
      [images[1]],
      [images[0]],
      [images[2]],
    ]);
  });

  it('returns a single view for a standalone card without media groups', () => {
    const root = readRecordedPage(40467);
    const { instance: mainImage } = root.media_groups[3].items[0];
    const views = selectViews({ mainImage, mediaGroups: [] });

    expect(views).toEqual([
      expect.objectContaining({ image: mainImage, imageVariants: [mainImage], groupId: null }),
    ]);
  });
});
