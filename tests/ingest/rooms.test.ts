import { readFileSync, readdirSync } from 'node:fs';
import { beforeAll, describe, expect, it } from 'vitest';
import { assignRoom } from '../../tools/ingest/lib/rooms.mjs';
import { resolveSources } from '../../tools/ingest/lib/sources.mjs';
import { selectViews } from '../../tools/ingest/lib/views.mjs';
import supplementalViews from '../../tools/ingest/supplemental.json' with { type: 'json' };

const roomSlugs = [
  'sea-level',
  'air-quality',
  'biodiversity',
  'wildfires',
  'greenhouse-gases',
  'energy',
  'disasters',
  'water-resources',
  'agriculture',
  'lab',
];
let sources: Awaited<ReturnType<typeof resolveSources>>;

beforeAll(async () => {
  const directory = new URL('../fixtures/svs/', import.meta.url);
  const pages = new Map();
  for (const filename of readdirSync(directory)) {
    if (!/^\d+\.json$/.test(filename)) continue;
    const page = JSON.parse(readFileSync(new URL(filename, directory), 'utf8'));
    pages.set(page.id, page);
  }
  sources = await resolveSources(pages, supplementalViews);
});

function sourceById(id: number) {
  const source = sources.find((entry) => entry.id === id);
  if (!source) throw new Error(`Missing recorded SVS source ${id}`);
  return source;
}

describe('assignRoom', () => {
  it('assigns every recorded view and marks four to six featured artifacts in each room', () => {
    const assignments = sources.flatMap((source) =>
      selectViews(source).map((view) => assignRoom(source, view)),
    );

    expect(assignments).toHaveLength(184);
    for (const { room, featured } of assignments) {
      expect(roomSlugs).toContain(room);
      expect(typeof featured).toBe('boolean');
    }
    for (const room of roomSlugs) {
      const featuredCount = assignments.filter(
        (entry) => entry.room === room && entry.featured,
      ).length;
      expect(featuredCount, room).toBeGreaterThanOrEqual(4);
      expect(featuredCount, room).toBeLessThanOrEqual(6);
    }
  });

  it('includes the selected supplemental media groups in Biodiversity', () => {
    const catalog = JSON.parse(
      readFileSync(new URL('../../public/catalog.json', import.meta.url), 'utf8'),
    );
    expect(supplementalViews).toHaveLength(4);
    for (const { id, groupId } of supplementalViews) {
      const views = selectViews(sourceById(id));
      expect(views.map((view) => view.groupId)).toEqual([groupId]);
      expect(
        catalog.artifacts.filter((artifact: { sourceId: number }) => artifact.sourceId === id),
      ).toMatchObject([
        { sourceId: id, viewGroupId: groupId, room: 'biodiversity', altSource: 'nasa' },
      ]);
    }
  });

  it.each([
    [479017, 'sea-level'],
    [5533, 'air-quality'],
    [4950, 'biodiversity'],
    [4993, 'wildfires'],
    [5196, 'greenhouse-gases'],
    [5313, 'energy'],
    [4960, 'disasters'],
    [4285, 'water-resources'],
    [5147, 'agriculture'],
    [14371, 'lab'],
    [5176, 'sea-level'],
    [5544, 'agriculture'],
    [5577, 'lab'],
    [5584, 'disasters'],
  ] as const)('assigns recorded source %i to %s', (id, room) => {
    const source = sourceById(id);

    expect(assignRoom(source, selectViews(source)[0])).toMatchObject({ room });
  });

  it('features the selected biodiversity group without featuring its sibling views', () => {
    const source = sourceById(4950);
    const assignments = selectViews(source).map((view) => ({
      groupId: view.groupId,
      ...assignRoom(source, view),
    }));

    expect(assignments).toMatchObject([
      { groupId: 316236, room: 'biodiversity', featured: false },
      { groupId: 316231, room: 'biodiversity', featured: true },
      { groupId: 316232, room: 'biodiversity', featured: false },
    ]);
  });

  it('identifies an unassigned source instead of guessing its room', () => {
    const source = { ...sourceById(5533), id: 987654321 };
    const [view] = selectViews(source);

    expect(() => assignRoom(source, view)).toThrow(/\b987654321\b/);
  });
});
