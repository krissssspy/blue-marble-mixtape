import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { format, resolveConfig } from 'prettier';
import { recordSnapshot } from './lib/refresh.mjs';

const directory = new URL('../../tests/fixtures/svs/', import.meta.url);
const manifest = new URL('manifest.json', directory);

async function loadPage(id) {
  const response = await fetch(`https://svs.gsfc.nasa.gov/api/${id}`, {
    signal: AbortSignal.timeout(30_000),
  });
  if (!response.ok) {
    throw new Error(`SVS API returned HTTP ${response.status} for page ${id}.`);
  }
  return response.json();
}

const { retrievedOn, pages } = await recordSnapshot(
  loadPage,
  new Date().toISOString().slice(0, 10),
);
const options = { ...(await resolveConfig(fileURLToPath(manifest))), parser: 'json' };
const files = [];
for (const [id, page] of pages) {
  files.push([new URL(`${id}.json`, directory), await format(JSON.stringify(page), options)]);
}
files.push([manifest, await format(JSON.stringify({ retrievedOn }), options)]);

await mkdir(directory, { recursive: true });
for (const [path, content] of files) {
  await writeFile(path, content);
}
