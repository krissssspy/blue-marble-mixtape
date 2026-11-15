import { readFileSync, readdirSync } from 'node:fs';
import { beforeAll, describe, expect, it } from 'vitest';
import { planCatalog } from '../../tools/ingest/lib/catalog.mjs';
import { resolveSources } from '../../tools/ingest/lib/sources.mjs';

const directory = new URL('../fixtures/svs/', import.meta.url);
const { retrievedOn } = JSON.parse(readFileSync(new URL('manifest.json', directory), 'utf8'));
const pages = new Map();
let sources: Awaited<ReturnType<typeof resolveSources>>;

beforeAll(async () => {
  for (const filename of readdirSync(directory)) {
    if (!/^\d+\.json$/.test(filename)) continue;
    const page = JSON.parse(readFileSync(new URL(filename, directory), 'utf8'));
    pages.set(page.id, page);
  }
  sources = await resolveSources(pages);
});

function sourceById(id: number) {
  const source = sources.find((entry) => entry.id === id);
  if (!source) throw new Error(`Missing recorded SVS source ${id}`);
  return source;
}

describe('planCatalog', () => {
  it('plans every recorded view in source order with unique stable IDs and media paths', () => {
    const plan = planCatalog(sources, retrievedOn);

    expect(plan).toHaveLength(180);
    const ids = plan.map(({ artifact }) => artifact.id);
    expect(new Set(ids).size).toBe(plan.length);
    expect(ids[0]).toBe('svs-media-860409-main');
    expect(ids.filter((id) => id.startsWith('svs-page-5533-'))).toEqual([
      'svs-page-5533-378003',
      'svs-page-5533-378004',
      'svs-page-5533-378005',
    ]);
    for (const { artifact } of plan) {
      const folder = `/media/${artifact.id}`;
      expect([...artifact.shortTitle].length).toBeGreaterThan(0);
      expect([...artifact.shortTitle].length).toBeLessThanOrEqual(18);
      expect(artifact.shortTitle).toBe(artifact.shortTitle.trim());
      expect(artifact.mediaPaths).toEqual({
        preview: `${folder}/preview.webp`,
        thumbnail: `${folder}/thumbnail.png`,
        features: `${folder}/features.bin`,
      });
    }
  });

  it('keeps recorded NASA metadata and inputs needed to process an artifact', () => {
    const source = sourceById(5533);
    const [entry] = planCatalog([source], retrievedOn);

    expect(entry.source).toBe(source);
    expect(entry.view).toMatchObject({ groupId: 378003, image: { id: 1154743 } });
    expect(entry.image).toMatchObject({ id: 1154743, filename: source.mainImage.filename });
    expect(entry.artifact).toMatchObject({
      id: 'svs-page-5533-378003',
      sourceId: 5533,
      viewGroupId: 378003,
      title: 'Air Quality Model Runs',
      pageType: 'Visualization',
      sourceUrl: 'https://svs.gsfc.nasa.gov/5533/',
      creditLine: expect.stringContaining('Helen-Nicole Kostis'),
      altText: expect.stringContaining('globe centered on the Americas'),
      altSource: 'authored',
      room: 'air-quality',
      featured: false,
      releaseDate: '2025-05-05',
      retrievalDate: retrievedOn,
      displayDate: '2025-05-05',
      fullResolution: {
        url: 'https://svs.gsfc.nasa.gov/vis/a000000/a005500/a005533/AirQuality_Sphere_1920x1080_0000.png',
        width: 1920,
        height: 1080,
      },
    });
  });

  it('uses the retrieval date when a later referring gallery is Daily Visualizations', () => {
    const source = sourceById(5147);
    expect(source.galleryIds).toEqual([40509, 40512]);

    const [{ artifact }] = planCatalog([source], retrievedOn);

    expect(artifact).toMatchObject({
      releaseDate: '2023-09-26',
      retrievalDate: retrievedOn,
      displayDate: retrievedOn,
    });
  });

  it('records an authored link description and a standalone media identity', () => {
    const [{ artifact }] = planCatalog([sourceById(860409)], retrievedOn);

    expect(artifact).toMatchObject({
      id: 'svs-media-860409-main',
      sourceId: 860409,
      viewGroupId: null,
      altText:
        'Terra satellite strips show cloud systems and sunlit terrain across part of Earth. Gold outlines mark the boundaries of neighboring satellite passes.',
      altSource: 'authored',
      displayDate: '2023-10-16',
    });
  });

  it('assigns distinct curated descriptions to the SIGGRAPH card and all three air-quality views', () => {
    const artifacts = planCatalog([sourceById(5425), sourceById(5533)], retrievedOn).map(
      ({ artifact }) => artifact,
    );
    const descriptions = Object.fromEntries(
      artifacts
        .filter(({ altSource }) => altSource === 'authored')
        .map(({ id, altText }) => [id, altText]),
    );

    expect(descriptions).toMatchObject({
      'svs-page-5425-378113':
        'White laurels frame a black title card reading SIGGRAPH Computer Animation Festival, Electronic Theater, 2025 Official Selection.',
      'svs-page-5533-378003':
        'An Earth globe centered on the Americas splits into yellow particulate matter, green nitrogen oxides, and purple ozone visualization bands.',
      'svs-page-5533-378004':
        'Side-by-side vertical bands show wildfire-related air pollutants across a flat world map, with a vivid red carbon monoxide plume covering much of South America.',
      'svs-page-5533-378005':
        'On a globe centered on the Americas, a red carbon monoxide plume spreads across central South America beside purple ozone and yellow particulate-matter bands.',
    });
  });

  it('identifies all 27 recorded views with authored descriptions', () => {
    const authored = planCatalog(sources, retrievedOn)
      .map(({ artifact }) => artifact)
      .filter(({ altSource }) => altSource === 'authored');

    expect(
      authored.map(({ sourceId, viewGroupId }) => `${sourceId}:${viewGroupId ?? 'main'}`),
    ).toEqual([
      '860409:main',
      '860410:main',
      '860411:main',
      '860412:main',
      '860413:main',
      '860414:main',
      '860415:main',
      '860416:main',
      '860417:main',
      '5150:main',
      '1139914:main',
      '1139915:main',
      '1139916:main',
      '1139917:main',
      '1139918:main',
      '1139919:main',
      '1139893:main',
      '1139894:main',
      '1139895:main',
      '1139896:main',
      '1139897:main',
      '14713:main',
      '5425:378113',
      '5533:378003',
      '5533:378004',
      '5533:378005',
      '5544:main',
    ]);
  });

  it('limits a short title without splitting Unicode characters', () => {
    const title = '  ABCDEFGHIJKLMNOPQ🌊 coast';
    const [{ artifact }] = planCatalog([{ ...sourceById(5533), title }], retrievedOn);

    expect(artifact.title).toBe(title);
    expect([...artifact.shortTitle].length).toBeLessThanOrEqual(18);
    expect(artifact.shortTitle).not.toMatch(/[\uD800-\uDFFF]/u);
    expect(artifact.shortTitle).toBe('ABCDEFGHIJKLMNOPQ🌊');
  });

  it('reports the source ID when no listening image is available', () => {
    const source = sourceById(5533);
    const wideImage = { ...source.mainImage, width: 4000 };
    const unavailable = { ...source, mainImage: wideImage, mediaGroups: [] };

    expect(() => planCatalog([unavailable], retrievedOn)).toThrow(/\b5533\b/);
  });

  it('uses the replacement January-through-December single-year image for recorded source 5072', () => {
    const recordedPage = pages.get(5072);
    expect(recordedPage.main_image.id).toBe(764822);

    const plan = planCatalog([sourceById(5072)], retrievedOn);

    expect(plan.map(({ view }) => view.groupId)).toEqual([311998, 311995, 311996]);
    expect(plan[0]).toMatchObject({
      view: { groupId: 311998, image: { id: 1206041 } },
      image: { id: 1206041, filename: 'atlantic_jan_to_dec_singleYear_print.jpg' },
      artifact: {
        id: 'svs-page-5072-311998',
        fullResolution: {
          url: 'https://svs.gsfc.nasa.gov/vis/a000000/a005000/a005072/atlantic_jan_to_dec_singleYear_print.jpg',
        },
      },
    });
    expect(recordedPage.main_image.id).toBe(764822);
  });

  it('preserves a valid main image in a newer response for source 5072', async () => {
    const page = pages.get(5072);
    const replacement = page.media_groups
      .flatMap(({ items }: { items: unknown[] }) => items)
      .find(({ instance }: { instance: { id: number } }) => instance.id === 1206030).instance;
    const updatedPages = new Map(pages).set(5072, { ...page, main_image: replacement });
    const updatedSources = await resolveSources(updatedPages);
    const source = updatedSources.find(({ id }) => id === 5072);
    if (!source) throw new Error('Missing recorded SVS source 5072');

    const plan = planCatalog([source], retrievedOn);

    expect(plan[0]).toMatchObject({ view: { groupId: 311996 }, image: { id: 1206030 } });
  });

  it('reports source 5072 when its stale main image has no recorded replacement', async () => {
    const page = pages.get(5072);
    expect(page.main_image.id).toBe(764822);
    const mediaGroups = page.media_groups.map(
      (group: { id: number; items: { instance?: { id: number } }[] }) =>
        group.id === 311998
          ? { ...group, items: group.items.filter(({ instance }) => instance?.id !== 1206041) }
          : group,
    );
    const incompletePages = new Map(pages).set(5072, { ...page, media_groups: mediaGroups });

    await expect(resolveSources(incompletePages)).rejects.toThrow(
      'Missing the replacement main image for SVS source 5072.',
    );
    const withoutGroup = page.media_groups.filter(({ id }: { id: number }) => id !== 311998);
    const missingGroupPages = new Map(pages).set(5072, { ...page, media_groups: withoutGroup });
    await expect(resolveSources(missingGroupPages)).rejects.toThrow(
      'Missing the replacement main image for SVS source 5072.',
    );
  });

  it('finds the exact replacement after empty items and another image in its group', async () => {
    const page = pages.get(5072);
    const otherImage = { instance: { ...page.main_image, id: 1 } };
    const mediaGroups = page.media_groups.map((group: { id: number; items: unknown[] }) =>
      group.id === 311998
        ? { ...group, items: [null, { instance: null }, otherImage, ...group.items] }
        : group,
    );
    const updatedPages = new Map(pages).set(5072, { ...page, media_groups: mediaGroups });

    const resolved = await resolveSources(updatedPages);

    expect(resolved.find(({ id }) => id === 5072)?.mainImage?.id).toBe(1206041);
  });

  it('leaves a missing main image on source 5072 and the same media ID on other sources', async () => {
    const page = pages.get(5072);
    const updatedPages = new Map(pages)
      .set(5072, { ...page, main_image: null })
      .set(5533, { ...pages.get(5533), main_image: page.main_image });

    const resolved = await resolveSources(updatedPages);

    expect(resolved.find(({ id }) => id === 5072)?.mainImage).toBeNull();
    expect(resolved.find(({ id }) => id === 5533)?.mainImage).toBe(page.main_image);
  });
});
