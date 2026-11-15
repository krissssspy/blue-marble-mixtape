import { readFileSync, readdirSync } from 'node:fs';
import { beforeAll, describe, expect, it } from 'vitest';
import { planCatalog } from '../../tools/ingest/lib/catalog.mjs';
import { verifyCatalogCoverage } from '../../tools/ingest/lib/completeness.mjs';
import { resolveSources } from '../../tools/ingest/lib/sources.mjs';

let sources: Awaited<ReturnType<typeof resolveSources>>;
let plans: ReturnType<typeof planCatalog>;

beforeAll(async () => {
  const directory = new URL('../fixtures/svs/', import.meta.url);
  const { retrievedOn } = JSON.parse(readFileSync(new URL('manifest.json', directory), 'utf8'));
  const pages = new Map();
  for (const filename of readdirSync(directory)) {
    if (!/^\d+\.json$/.test(filename)) continue;
    const page = JSON.parse(readFileSync(new URL(filename, directory), 'utf8'));
    pages.set(page.id, page);
  }
  sources = await resolveSources(pages);
  plans = planCatalog(sources, retrievedOn);
});

function sourceById(id: number) {
  const source = sources.find((entry) => entry.id === id);
  if (!source) throw new Error(`Missing recorded SVS source ${id}`);
  return source;
}

describe('verifyCatalogCoverage', () => {
  it('accounts for all collected sources and records only the documented exclusion', () => {
    expect(sources).toHaveLength(103);
    expect(plans).toHaveLength(180);
    expect(new Set(plans.map(({ source }) => `${source.type}:${source.id}`)).size).toBe(102);

    const excluded = verifyCatalogCoverage(
      sources.map((source) => ({ ...source })),
      plans,
    );

    expect(excluded).toMatchObject([
      {
        id: 1,
        type: 'link',
        title: 'Air Quality Index for DC',
        reason: expect.stringMatching(/no[-_ ]?preview|placeholder/i),
      },
    ]);
  });

  it('identifies a dropped source after all of its views are removed', () => {
    const incomplete = plans.filter(({ source }) => source.id !== 5533);

    expect(() => verifyCatalogCoverage(sources, incomplete)).toThrow(/\b5533\b/);
  });

  it('does not let a plan for one source type cover another source with the same ID', () => {
    const source = sourceById(5533);
    const missing = { ...source, type: 'link' };

    expect(() => verifyCatalogCoverage([...sources, missing], plans)).toThrow(/\b5533\b/);
  });

  it('does not reuse the documented exclusion for a different ID, type, or real image', () => {
    const excluded = sourceById(1);
    const differentType = { ...excluded, type: 'details_page' };
    const differentId = { ...excluded, id: 2000 };
    const realImage = { ...excluded, mainImage: { ...sourceById(860409).mainImage, id: 1 } };

    expect(() => verifyCatalogCoverage([differentType], [])).toThrow(/\b1\b/);
    expect(() => verifyCatalogCoverage([differentId], [])).toThrow(/\b2000\b/);
    expect(() => verifyCatalogCoverage([realImage], [])).toThrow(/\b1\b/);
  });
});
