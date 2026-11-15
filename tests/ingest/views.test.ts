import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { selectViews } from '../../tools/ingest/lib/views.mjs';

function readRecordedPage(id: number) {
  return JSON.parse(readFileSync(new URL(`../fixtures/svs/${id}.json`, import.meta.url), 'utf8'));
}

function image(id: number, filename: string) {
  return {
    id,
    filename,
    url: `https://svs.gsfc.nasa.gov/images/${filename}`,
    media_type: 'Image',
    width: 960,
    height: 540,
  };
}

function imageGroup(id: number, ...images: ReturnType<typeof image>[]) {
  return { id, items: images.map((instance) => ({ type: 'media', instance })) };
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

  it('keeps the recorded print image and skips preview variants and standalone color bars', () => {
    const page = readRecordedPage(5147);
    const views = selectViews({ mainImage: page.main_image, mediaGroups: page.media_groups });

    expect(views.map(({ groupId }) => groupId)).toEqual([371871]);
    expect(views[0].image).toEqual(page.main_image);
    expect(views[0].imageVariants).toEqual([page.main_image]);
  });

  it('skips standalone precipitation color bars identified by their recorded alt text', () => {
    const page = readRecordedPage(4285);
    const views = selectViews({ mainImage: page.main_image, mediaGroups: page.media_groups });

    expect(views.map(({ groupId }) => groupId)).toEqual([338068, 338071]);
    expect(views[0].image).toEqual(page.main_image);
  });

  it('rejects a standalone colour bar identified by its alt text', () => {
    const mainImage = {
      ...image(1, 'temperature_scale.png'),
      alt_text: '  Colour Bar for surface temperature',
    };

    expect(selectViews({ mainImage, mediaGroups: [] })).toEqual([]);
  });

  it('keeps a data view when its alt text describes a map with a colorbar', () => {
    const mainImage = image(1, 'sea_surface.png');
    const map = {
      ...image(2, 'regional_map.png'),
      alt_text: 'A map of sea surface temperatures, with a colorbar along the bottom.',
    };
    const mediaGroups = [imageGroup(1, mainImage), imageGroup(2, map)];

    const views = selectViews({ mainImage, mediaGroups });

    expect(views.map(({ image }) => image)).toEqual([mainImage, map]);
  });

  it('fills the remaining view slots with distinct images after skipping alternate sizes and placeholders', () => {
    const mainImage = {
      ...image(10, 'surface_temperature_1920x1080.png'),
      width: 1920,
      height: 1080,
    };
    const map = image(70, 'regional_map_w_colorbar.png');
    const ice = image(80, 'ice_extent.png');
    const mediaGroups = [
      [mainImage],
      [image(20, 'surface_temperature.jpg')],
      [image(30, 'fallback-no-preview-small.png')],
      [image(40, 'wind_thm.png')],
      [image(50, 'thermal_colorbar.png')],
      [image(60, 'regional_map_w_colorbar_web.png'), map],
      [ice],
    ].map((images, index) => ({
      id: index + 1,
      items: images.map((instance) => ({ type: 'media', instance })),
    }));

    const views = selectViews({ mainImage, mediaGroups });

    expect(views.map(({ groupId }) => groupId)).toEqual([1, 6, 7]);
    expect(views.map(({ image }) => image)).toEqual([mainImage, map, ice]);
    expect(views.map(({ imageVariants }) => imageVariants)).toEqual([[mainImage], [map], [ice]]);
  });

  it('rejects a standalone no-preview image', () => {
    const mainImage = {
      id: 1,
      filename: 'no_preview.png',
      url: 'https://svs.gsfc.nasa.gov/images/no_preview.png',
      media_type: 'Image',
      width: 180,
      height: 320,
    };

    expect(selectViews({ mainImage, mediaGroups: [] })).toEqual([]);
  });

  it.each(['legend.png', 'colorbar.png'])('rejects the standalone asset %s', (filename) => {
    expect(selectViews({ mainImage: image(1, filename), mediaGroups: [] })).toEqual([]);
  });

  it('replaces the main preview with its full image before earlier sibling groups', () => {
    const page = readRecordedPage(14696);
    const sibling = image(1, 'regional_map.png');
    const mediaGroups = [imageGroup(1, sibling), ...page.media_groups];
    const views = selectViews({ mainImage: page.main_image, mediaGroups });

    expect(views).toMatchObject([
      {
        groupId: 375932,
        image: { id: 1100886, filename: 'Smithsonian_GHG.png' },
        imageVariants: [{ id: 1100886 }],
      },
      { groupId: 1, image: sibling, imageVariants: [sibling] },
    ]);
  });

  it('keeps a valid standalone main image ahead of distinct grouped images', () => {
    const mainImage = image(1, 'ocean_print.png');
    const sibling = image(3, 'regional_map.png');
    const mediaGroups = [imageGroup(1, image(2, 'ocean.png')), imageGroup(2, sibling)];

    expect(selectViews({ mainImage, mediaGroups })).toEqual([
      { groupId: null, image: mainImage, imageVariants: [mainImage] },
      { groupId: 2, image: sibling, imageVariants: [sibling] },
    ]);
  });

  it('selects grouped images when the source has no main image', () => {
    const sibling = image(1, 'regional_map.png');
    expect(selectViews({ mainImage: null, mediaGroups: [imageGroup(1, sibling)] })).toEqual([
      { groupId: 1, image: sibling, imageVariants: [sibling] },
    ]);
  });

  it('skips a whole group if any variant repeats a selected media ID under a different name', () => {
    const mainImage = image(1, 'ocean.png');
    const ice = image(3, 'ice_extent.png');
    const mediaGroups = [
      imageGroup(1, mainImage),
      imageGroup(2, image(2, 'regional_map.png'), image(1, 'sea_surface.png')),
      imageGroup(3, ice),
    ];

    expect(selectViews({ mainImage, mediaGroups })).toEqual([
      { groupId: 1, image: mainImage, imageVariants: [mainImage] },
      { groupId: 3, image: ice, imageVariants: [ice] },
    ]);
  });

  it.each([
    [14371, 'B-Roll', 312120, 856095, [856095, 856094]],
    [14696, 'Produced Video', 375932, 1100886, [1100886]],
    [14713, 'Produced Video', null, 1139025, [1139025]],
  ])(
    'selects only the supplied poster view from recorded page %i (%s)',
    (id, pageType, groupId, posterId, variantIds) => {
      const page = readRecordedPage(id);
      expect(page.page_type).toBe(pageType);
      const views = selectViews({
        pageType,
        mainImage: page.main_image,
        mediaGroups: page.media_groups,
      });

      expect(views).toMatchObject([
        {
          groupId,
          image: { id: posterId, media_type: 'Image' },
          imageVariants: variantIds.map((id) => ({ id, media_type: 'Image' })),
        },
      ]);
    },
  );

  it.each(['Produced Video', 'B-Roll'])(
    'does not substitute another still when a %s has no usable poster',
    (pageType) => {
      const placeholder = image(1, 'no_preview.png');
      const movie = { ...image(3, 'source.mp4'), media_type: 'Movie' };
      const mediaGroups = [
        imageGroup(1, placeholder),
        imageGroup(2, image(2, 'another_still.png')),
      ];

      expect(selectViews({ pageType, mainImage: null, mediaGroups })).toEqual([]);
      expect(selectViews({ pageType, mainImage: placeholder, mediaGroups })).toEqual([]);
      expect(selectViews({ pageType, mainImage: movie, mediaGroups })).toEqual([]);
    },
  );
});
