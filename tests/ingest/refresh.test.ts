import { describe, expect, it } from 'vitest';
import { recordSnapshot } from '../../tools/ingest/lib/refresh.mjs';

const rootId = 40467;
const retrievedOn = '2026-11-14';

function gallery(id: number, cards: [string, number][]) {
  const items = cards.map(([type, instanceId]) => ({ type, instance: { id: instanceId } }));
  return { id, title: `Gallery ${id}`, media_groups: [{ widget: 'Card gallery', items }] };
}

describe('recordSnapshot', () => {
  it('records standalone selected sources alongside the crawl without loading duplicates', async () => {
    const root = gallery(rootId, [['details_page', 301]]);
    const detail = { id: 301, title: 'Ice cover', media_groups: [] };
    const standalone = { id: 302, title: 'Coral reef', media_groups: [] };
    const pages = new Map([
      [rootId, root],
      [301, detail],
      [302, standalone],
    ]);
    const requested: number[] = [];
    const snapshot = await recordSnapshot(
      async (id: number) => {
        requested.push(id);
        return pages.get(id);
      },
      retrievedOn,
      [302, 301, 302],
    );
    expect(snapshot.pages).toEqual(pages);
    expect(requested).toEqual([rootId, 301, 302]);
  });

  it('records the root, nested galleries and unique details with the given retrieval date', async () => {
    const pages = new Map([
      [
        rootId,
        gallery(rootId, [
          ['gallery_page', 101],
          ['details_page', 301],
          ['link', 401],
          ['media_group', 501],
        ]),
      ],
      [101, gallery(101, [['gallery_page', 201]])],
      [
        201,
        gallery(201, [
          ['details_page', 301],
          ['details_page', 302],
        ]),
      ],
      [301, { id: 301, title: 'Ice cover', media_groups: [] }],
      [302, { id: 302, title: 'Sea level', media_groups: [] }],
    ]);
    const requested: number[] = [];

    const snapshot = await recordSnapshot(async (id: number) => {
      requested.push(id);
      const page = pages.get(id);
      if (!page) throw new Error(`Unexpected fixture page ${id}`);
      return page;
    }, retrievedOn);

    expect(snapshot.retrievedOn).toBe(retrievedOn);
    expect(snapshot.pages).toBeInstanceOf(Map);
    expect(snapshot.pages).toEqual(pages);
    expect(requested.sort((a, b) => a - b)).toEqual([101, 201, 301, 302, rootId]);
  });

  it('reports a detail load failure with its first referring gallery and original cause', async () => {
    const cause = new Error('Recorded response is unavailable');
    const error = await recordSnapshot(async (id: number) => {
      if (id === rootId) return gallery(rootId, [['gallery_page', 101]]);
      if (id === 101) return gallery(101, [['details_page', 301]]);
      throw cause;
    }, retrievedOn).catch((failure: unknown) => failure);

    expect(error).toBeInstanceOf(Error);
    expect((error as Error).message).toMatch(/\b301\b/);
    expect((error as Error).message).toMatch(/\b101\b/);
    expect((error as Error).cause).toBe(cause);
  });

  it.each([
    ['is null', null, 'undefined'],
    ['omits its ID', { title: 'Ice cover', media_groups: [] }, 'undefined'],
    ['reports a different ID', { id: 999, title: 'Ice cover', media_groups: [] }, '999'],
  ])('rejects a detail response that %s', async (_label, page, receivedId) => {
    const snapshot = recordSnapshot(async (id: number) => {
      if (id === rootId) return gallery(rootId, [['details_page', 301]]);
      return page;
    }, retrievedOn);

    await expect(snapshot).rejects.toThrow(/\b301\b/);
    await expect(snapshot).rejects.toHaveProperty(
      'cause.message',
      `Expected SVS page 301, received ID ${receivedId}.`,
    );
  });
});
