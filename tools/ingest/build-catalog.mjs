import { readFile, readdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { buildCatalog } from './lib/build-catalog.mjs';
import { resolveSources } from './lib/sources.mjs';
import supplementalViews from './supplemental.json' with { type: 'json' };

const fixtures = new URL('../../tests/fixtures/svs/', import.meta.url);
const output = fileURLToPath(new URL('../../public/', import.meta.url));
const { retrievedOn } = JSON.parse(await readFile(new URL('manifest.json', fixtures), 'utf8'));
const pages = new Map();
for (const filename of await readdir(fixtures)) {
  if (!/^\d+\.json$/.test(filename)) continue;
  const page = JSON.parse(await readFile(new URL(filename, fixtures), 'utf8'));
  pages.set(page.id, page);
}

await buildCatalog(await resolveSources(pages, supplementalViews), retrievedOn, output);
