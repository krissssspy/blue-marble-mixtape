import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { crawlGallery, readGalleryCards } from '../../tools/ingest/lib/svs.mjs';

function readRecordedPage(id: number) {
  return JSON.parse(readFileSync(new URL(`../fixtures/svs/${id}.json`, import.meta.url), 'utf8'));
}

describe('readGalleryCards', () => {
  it('returns the EIC root cards in order using their instance IDs and types', () => {
    const page = readRecordedPage(40467);

    expect(readGalleryCards(page)).toEqual([
      { type: 'gallery_page', id: 40509 },
      { type: 'gallery_page', id: 40473 },
      { type: 'gallery_page', id: 40477 },
      { type: 'gallery_page', id: 40479 },
      { type: 'gallery_page', id: 40529 },
      { type: 'gallery_page', id: 40531 },
      { type: 'gallery_page', id: 40487 },
      { type: 'gallery_page', id: 40484 },
      { type: 'details_page', id: 14700 },
      { type: 'details_page', id: 14606 },
      { type: 'details_page', id: 14696 },
      { type: 'details_page', id: 14568 },
      { type: 'details_page', id: 14507 },
      { type: 'details_page', id: 14713 },
      { type: 'media_group', id: 479017 },
      { type: 'details_page', id: 4950 },
      { type: 'details_page', id: 4993 },
      { type: 'details_page', id: 4960 },
      { type: 'details_page', id: 5011 },
      { type: 'details_page', id: 5313 },
      { type: 'details_page', id: 5196 },
      { type: 'details_page', id: 5425 },
      { type: 'details_page', id: 5533 },
      { type: 'details_page', id: 14371 },
      { type: 'gallery_page', id: 40512 },
    ]);
  });
});

describe('crawlGallery', () => {
  it('collects terminal records from the EIC root and its recorded galleries in source order', async () => {
    const entries = await crawlGallery(async (id: number) => readRecordedPage(id));

    expect(entries).toHaveLength(103);
    expect(entries.filter(({ type }) => type === 'details_page')).toHaveLength(79);
    expect(entries.filter(({ type }) => type === 'link')).toHaveLength(21);
    expect(entries.filter(({ type }) => type === 'media_group')).toHaveLength(3);
    expect(entries.find(({ type, id }) => type === 'details_page' && id === 5147)).toMatchObject({
      galleryId: 40509,
      galleryIds: [40509, 40512],
    });

    const checkpoints = [860409, 5111, 367972, 14700, 479017, 4285];
    expect(entries.filter(({ id }) => checkpoints.includes(id))).toEqual([
      expect.objectContaining({ type: 'link', id: 860409, galleryId: 40509 }),
      expect.objectContaining({ type: 'details_page', id: 5111, galleryId: 40473 }),
      expect.objectContaining({ type: 'media_group', id: 367972, galleryId: 40477 }),
      expect.objectContaining({ type: 'details_page', id: 14700, galleryId: 40467 }),
      expect.objectContaining({ type: 'media_group', id: 479017, galleryId: 40467 }),
      expect.objectContaining({ type: 'details_page', id: 4285, galleryId: 40512 }),
    ]);
  });

  it('follows a gallery nested inside another gallery before continuing with sibling cards', async () => {
    const pages = new Map<number, { type: string; instance: { id: number } }[]>([
      [40467, [{ type: 'gallery_page', instance: { id: 100 } }]],
      [
        100,
        [
          { type: 'gallery_page', instance: { id: 200 } },
          { type: 'details_page', instance: { id: 300 } },
        ],
      ],
      [200, [{ type: 'details_page', instance: { id: 400 } }]],
    ]);

    const entries = await crawlGallery(async (id: number) => {
      const items = pages.get(id);
      if (!items) throw new Error(`Unexpected fixture page ${id}`);
      return { id, media_groups: [{ items }] };
    });

    expect(entries).toEqual([
      expect.objectContaining({ type: 'details_page', id: 400, galleryId: 200 }),
      expect.objectContaining({ type: 'details_page', id: 300, galleryId: 100 }),
    ]);
  });

  it('keeps the first reference to each page or media ID and visits each gallery once', async () => {
    const root = 40467;
    const pages = new Map<number, [string, number][]>([
      [
        root,
        [
          ['details_page', 200],
          ['gallery_page', 100],
          ['gallery_page', 100],
          ['details_page', 300],
          ['media_group', 200],
          ['link', 400],
        ],
      ],
      [
        100,
        [
          ['link', 200],
          ['details_page', 200],
          ['details_page', 200],
          ['details_page', 300],
          ['media_group', 400],
          ['gallery_page', root],
        ],
      ],
    ]);
    const visited = new Set<number>();
    const entries = await crawlGallery(async (id: number) => {
      if (visited.has(id)) throw new Error(`Gallery ${id} was loaded more than once`);
      visited.add(id);
      const cards = pages.get(id);
      if (!cards) throw new Error(`Unexpected fixture page ${id}`);
      const items = cards.map(([type, instanceId]) => ({ type, instance: { id: instanceId } }));
      return { id, media_groups: [{ items }] };
    });

    expect(entries).toEqual([
      expect.objectContaining({
        type: 'details_page',
        id: 200,
        galleryId: root,
        galleryIds: [root, 100],
      }),
      expect.objectContaining({ type: 'link', id: 200, galleryId: 100, galleryIds: [100, root] }),
      expect.objectContaining({
        type: 'details_page',
        id: 300,
        galleryId: 100,
        galleryIds: [100, root],
      }),
      expect.objectContaining({
        type: 'media_group',
        id: 400,
        galleryId: 100,
        galleryIds: [100, root],
      }),
    ]);
  });
});
