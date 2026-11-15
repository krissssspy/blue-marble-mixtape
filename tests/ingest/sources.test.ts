import { readFileSync, readdirSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { resolveSources } from '../../tools/ingest/lib/sources.mjs';

const fixtures = new URL('../fixtures/svs/', import.meta.url);

function recordedPages() {
  const pages = new Map();
  for (const filename of readdirSync(fixtures)) {
    if (!/^\d+\.json$/.test(filename)) continue;
    const page = JSON.parse(readFileSync(new URL(filename, fixtures), 'utf8'));
    pages.set(page.id, page);
  }
  return pages;
}

describe('resolveSources', () => {
  it('appends only the selected view from a supplemental detail page', async () => {
    const pages = recordedPages();
    const supplementalId = 90000;
    const standalone = { ...pages.get(5533), id: supplementalId, title: 'Supplemental image' };
    const group = standalone.media_groups[1];
    pages.set(supplementalId, standalone);
    const existing = await resolveSources(pages);

    const sources = await resolveSources(pages, [{ id: supplementalId, groupId: group.id }]);
    expect(sources.slice(0, -1)).toEqual(existing);
    expect(sources.at(-1)).toMatchObject({
      id: supplementalId,
      type: 'details_page',
      title: 'Supplemental image',
      galleryIds: [],
      mainImage: null,
      mediaGroups: [group],
    });
    await expect(resolveSources(pages, [{ id: supplementalId, groupId: -1 }])).rejects.toThrow(
      /90000.*-1/,
    );
    await expect(resolveSources(pages, [{ id: 5533, groupId: group.id }])).rejects.toThrow(
      /5533.*already/,
    );
  });

  it('resolves the recorded sources in crawl order with their source metadata', async () => {
    const pages = recordedPages();
    const sources = await resolveSources(pages);

    expect(sources).toHaveLength(103);
    expect(sources[0]).toMatchObject({ id: 860409, type: 'link' });
    const checkpoints = [860409, 479017, 5533, 14371];
    expect(sources.filter(({ id }) => checkpoints.includes(id)).map(({ id }) => id)).toEqual(
      checkpoints,
    );

    const detail = pages.get(5533);
    const airQuality = sources.find(({ id }) => id === 5533);
    expect(airQuality).toMatchObject({
      id: 5533,
      type: 'details_page',
      title: 'Air Quality Model Runs',
      description: detail.description,
      pageType: 'Visualization',
      sourceUrl: 'https://svs.gsfc.nasa.gov/5533/',
      releaseDate: '2025-05-05',
      creditLine: expect.stringContaining('Helen-Nicole Kostis'),
      mainImage: expect.objectContaining({ id: 1154743 }),
      mediaGroups: detail.media_groups,
    });
    expect(airQuality?.creditLine).toBe(
      'Visualizations by: Helen-Nicole Kostis, Joseph V. Ardizzone; Scientific consulting by: Lesley Ott',
    );
    expect(airQuality?.creditLine).toContain('Joseph V. Ardizzone');
    expect(airQuality?.creditLine).toContain('Lesley Ott');
    expect(airQuality?.creditLine).not.toContain('Laurence Schuler');

    expect(sources.find(({ id }) => id === 14371)).toMatchObject({
      pageType: 'B-Roll',
      creditLine: expect.stringContaining('Ellen T. Gray'),
    });

    const embeddedCard = pages
      .get(40467)
      .media_groups.find(({ id }: { id: number }) => id === 371618).items[0];
    const nasaSvsCredit = expect.stringMatching(
      /\bNASA\b.*(?:\bSVS\b|Scientific Visualization Studio)/i,
    );
    expect(sources.find(({ id }) => id === 479017)).toMatchObject({
      type: 'media_group',
      galleryIds: [40467],
      title: 'Global Sea Surface Currents and Temperature',
      description: embeddedCard.caption,
      sourceUrl: 'https://svs.gsfc.nasa.gov/gallery/earth-information-center/#media_group_371618',
      releaseDate: '2023-06-07',
      creditLine: nasaSvsCredit,
      mainImage: expect.objectContaining({ id: 479017 }),
      mediaGroups: [],
    });
    expect(sources.find(({ id }) => id === 860409)).toMatchObject({
      type: 'link',
      galleryIds: [40509],
      title: 'True color imagery from Terra satellite',
      sourceUrl: 'https://svs.gsfc.nasa.gov/gallery/earth-now-dashboard/#media_group_372598',
      releaseDate: '2023-10-16',
      creditLine: nasaSvsCredit,
      mainImage: expect.objectContaining({ id: 860409 }),
    });
    expect(sources.find(({ id }) => id === 860410)).toMatchObject({
      type: 'link',
      title: 'Black Marble night time imagery from Suomi NPP satellite',
      mainImage: expect.objectContaining({ id: 860410 }),
      mediaGroups: [],
    });
  });

  it('reports the exact ID of a source page missing from the snapshot', async () => {
    const pages = recordedPages();
    pages.delete(5533);

    await expect(resolveSources(pages)).rejects.toThrow('No recorded response for SVS page 5533.');
  });

  it('resolves an embedded media card separately from a detail page with the same ID', async () => {
    const pages = recordedPages();
    const root = pages.get(40467);
    root.media_groups[0].items.push({ type: 'details_page', instance: { id: 479017 } });
    pages.set(479017, { ...pages.get(5533), id: 479017 });

    const sources = await resolveSources(pages);
    expect(sources.filter(({ id }) => id === 479017)).toMatchObject([
      { type: 'details_page', title: 'Air Quality Model Runs' },
      {
        type: 'media_group',
        title: 'Global Sea Surface Currents and Temperature',
        sourceUrl: 'https://svs.gsfc.nasa.gov/gallery/earth-information-center/#media_group_371618',
        mainImage: expect.objectContaining({ id: 479017 }),
      },
    ]);
  });
});
