import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { readGalleryCards } from '../../tools/ingest/lib/svs.mjs';

describe('readGalleryCards', () => {
  it('returns the EIC root cards in order using their instance IDs and types', () => {
    const page = JSON.parse(
      readFileSync(new URL('../fixtures/svs/40467.json', import.meta.url), 'utf8'),
    );

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
