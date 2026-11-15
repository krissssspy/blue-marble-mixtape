import { spawnSync } from 'node:child_process';
import {
  cpSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

const repository = fileURLToPath(new URL('../../', import.meta.url));
const root = {
  id: 40467,
  title: 'Gallery',
  media_groups: [
    { widget: 'Card gallery', items: [{ type: 'details_page', instance: { id: 301 } }] },
  ],
};
const detail = { id: 301, title: 'Ice cover', media_groups: [] };
const supplemental = { id: 302, title: 'Coral reef', media_groups: [] };
const retrievedOn = '2026-11-14';

describe('SVS refresh CLI', () => {
  let cwd: string;
  let fixtures: string;

  beforeEach(() => {
    cwd = mkdtempSync(join(tmpdir(), 'svs-refresh-'));
    fixtures = join(cwd, 'tests', 'fixtures', 'svs');
    mkdirSync(join(cwd, 'tools'), { recursive: true });
    cpSync(join(repository, 'tools', 'ingest'), join(cwd, 'tools', 'ingest'), { recursive: true });
    writeFileSync(
      join(cwd, 'tools', 'ingest', 'supplemental.json'),
      JSON.stringify([{ id: supplemental.id, groupId: 1 }]),
    );
    cpSync(join(repository, '.prettierrc'), join(cwd, '.prettierrc'));
    symlinkSync(join(repository, 'node_modules'), join(cwd, 'node_modules'), 'junction');
  });

  afterEach(() => {
    if (cwd) rmSync(cwd, { recursive: true, force: true });
  });

  function refresh(detailStatus: number) {
    const preload = join(cwd, 'fixture-fetch.mjs');
    writeFileSync(
      preload,
      `import { mock } from 'node:test';
mock.timers.enable({ apis: ['Date'], now: new Date('${retrievedOn}T12:00:00Z') });
const responses = new Map([
  ['https://svs.gsfc.nasa.gov/api/40467', [${JSON.stringify(root)}, 200]],
  ['https://svs.gsfc.nasa.gov/api/301', [${JSON.stringify(detail)}, ${detailStatus}]],
  ['https://svs.gsfc.nasa.gov/api/302', [${JSON.stringify(supplemental)}, 200]],
]);
globalThis.fetch = async (url) => {
  if (!responses.has(url)) throw new Error('Unexpected fixture URL: ' + url);
  const [body, status] = responses.get(url);
  return Response.json(body, { status });
};
`,
    );
    const result = spawnSync(
      process.execPath,
      ['--import', preload, join(cwd, 'tools', 'ingest', 'refresh.mjs')],
      { cwd, encoding: 'utf8', timeout: 10_000 },
    );
    if (result.error) throw result.error;
    return result;
  }

  it('records the exact root, detail, and supplemental documents and the UTC retrieval date', () => {
    const { status, stderr } = refresh(200);
    expect(status, stderr).toBe(0);
    expect(readdirSync(fixtures).sort()).toEqual([
      '301.json',
      '302.json',
      '40467.json',
      'manifest.json',
    ]);
    expect(JSON.parse(readFileSync(join(fixtures, '40467.json'), 'utf8'))).toEqual(root);
    expect(JSON.parse(readFileSync(join(fixtures, '301.json'), 'utf8'))).toEqual(detail);
    expect(JSON.parse(readFileSync(join(fixtures, '302.json'), 'utf8'))).toEqual(supplemental);
    expect(JSON.parse(readFileSync(join(fixtures, 'manifest.json'), 'utf8'))).toEqual({
      retrievedOn,
    });
  });

  it('reports a failed HTTP response and leaves the previous snapshot intact', () => {
    mkdirSync(fixtures, { recursive: true });
    const previous = {
      '301.json': '{"id":301,"title":"Previous detail"}\n',
      '40467.json': '{"id":40467,"title":"Previous root"}\n',
      'manifest.json': '{"retrievedOn":"2025-07-01"}\n',
    };
    for (const [file, content] of Object.entries(previous)) {
      writeFileSync(join(fixtures, file), content);
    }

    const { status, stderr } = refresh(503);
    expect(status, stderr).toBeGreaterThan(0);
    expect(stderr).toMatch(/HTTP 503 for page 301\b/);
    expect(readdirSync(fixtures).sort()).toEqual(Object.keys(previous).sort());
    for (const [file, content] of Object.entries(previous)) {
      expect(readFileSync(join(fixtures, file), 'utf8')).toBe(content);
    }
  });
});
