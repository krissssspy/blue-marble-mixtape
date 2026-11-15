import { readFileSync, readdirSync } from 'node:fs';
import { beforeAll, describe, expect, it } from 'vitest';
import { planCatalog } from '../../tools/ingest/lib/catalog.mjs';
import { resolveSources } from '../../tools/ingest/lib/sources.mjs';

const directory = new URL('../fixtures/svs/', import.meta.url);
const { retrievedOn } = JSON.parse(readFileSync(new URL('manifest.json', directory), 'utf8'));
let sources: Awaited<ReturnType<typeof resolveSources>>;

beforeAll(async () => {
  const pages = new Map();
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
      altText: expect.stringContaining('transport of Carbon Monoxide'),
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
      altText: 'True color imagery from Terra satellite',
      altSource: 'authored',
      displayDate: '2023-10-16',
    });
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
});
