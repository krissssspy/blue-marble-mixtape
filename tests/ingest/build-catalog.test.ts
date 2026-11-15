import { spawnSync } from 'node:child_process';
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { rename } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { buildCatalog } from '../../tools/ingest/lib/build-catalog.mjs';
import { resolveSources } from '../../tools/ingest/lib/sources.mjs';

vi.mock('node:fs/promises', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:fs/promises')>();
  return { ...actual, rename: vi.fn(actual.rename) };
});

const stillId = 'svs-media-860409-main';
const movieId = 'svs-page-30521-340117';
const stillUrl =
  'https://svs.gsfc.nasa.gov/images/gallery/EarthNowDashboard/WorldView_TrueColor.png';
const moviePosterUrl =
  'https://svs.gsfc.nasa.gov/vis/a030000/a030500/a030521/grace_ca_drought_v4_0128_print.jpg';
const date = '2026-11-15';
const config = '{"navigationFallback":{"rewrite":"/index.html"}}\n';
const previousCatalog = '{"generation":"previous"}\n';
const previousPreview = Buffer.from('previous preview');
const fixtures = new URL('../fixtures/svs/', import.meta.url);
let fixtureSources: Awaited<ReturnType<typeof resolveSources>>;
let outputDir: string;

beforeAll(async () => {
  const pages = new Map();
  for (const filename of readdirSync(fixtures)) {
    if (!/^\d+\.json$/.test(filename)) continue;
    const page = JSON.parse(readFileSync(new URL(filename, fixtures), 'utf8'));
    pages.set(page.id, page);
  }
  fixtureSources = (await resolveSources(pages)).filter(({ id }) =>
    [1, 30521, 860409].includes(id),
  );
});

beforeEach(() => {
  outputDir = mkdtempSync(join(tmpdir(), 'build-catalog-test-'));
  writeFileSync(join(outputDir, 'staticwebapp.config.json'), config);
});

afterEach(() => {
  vi.unstubAllGlobals();
  rmSync(outputDir, { recursive: true, force: true });
});

function png(width: number, height: number) {
  return sharp({ create: { width, height, channels: 3, background: '#407a98' } })
    .png()
    .toBuffer();
}

function readOutput(path: string) {
  return readFileSync(join(outputDir, path));
}

function writePreviousOutput(id: string) {
  const media = join(outputDir, 'media', id);
  mkdirSync(media, { recursive: true });
  writeFileSync(join(media, 'preview.webp'), previousPreview);
  writeFileSync(join(outputDir, 'catalog.json'), previousCatalog);
}

function expectFeaturePack(path: string, channels: number, frames: number) {
  const pack = readOutput(path);
  expect(pack.toString('ascii', 0, 4)).toBe('BMMF');
  expect(pack[4]).toBe(1);
  expect(pack[5]).toBe(channels);
  expect([pack.readUInt16LE(6), pack.readUInt16LE(8), pack.readUInt16LE(10)]).toEqual([
    96,
    54,
    frames,
  ]);
  expect(pack.length).toBe(12 + 96 * 54 * channels * frames);
}

describe('buildCatalog', () => {
  it('writes a catalog and its still and featured media with verified dimensions', async () => {
    writePreviousOutput('stale-artifact');
    const sources = structuredClone(fixtureSources);
    const [wideImage, moviePoster] = await Promise.all([png(4096, 2048), png(64, 36)]);
    const fetchImage = vi.fn(async (url: string) => {
      if (url === stillUrl) return wideImage;
      if (url === moviePosterUrl) return moviePoster;
      throw new Error(`Unexpected image URL ${url}`);
    });
    const frame = Buffer.alloc(320 * 180 * 3, 90);
    const sampleFrames = vi.fn(
      async (
        _source: { id: number },
        _view: { groupId: number | null },
        { featured }: { featured: boolean },
      ) => (featured ? Array.from({ length: 48 }, () => frame) : null),
    );

    const result = await buildCatalog(sources, date, outputDir, { fetchImage, sampleFrames });

    expect(result.retrievedOn).toBe(date);
    expect(JSON.parse(readOutput('catalog.json').toString('utf8'))).toEqual(result);
    expect(result.excludedSources).toMatchObject([
      { id: 1, type: 'link', title: 'Air Quality Index for DC' },
    ]);
    expect(fetchImage.mock.calls.map(([url]) => url).sort()).toEqual(
      [stillUrl, moviePosterUrl].sort(),
    );
    expect(sampleFrames).toHaveBeenCalledWith(
      expect.objectContaining({ id: 30521 }),
      expect.objectContaining({ groupId: 340117 }),
      expect.objectContaining({ featured: true }),
    );
    expect(sources).toEqual(fixtureSources);
    expect(readOutput('staticwebapp.config.json').toString('utf8')).toBe(config);

    expect(result.artifacts).toHaveLength(2);
    expect(readdirSync(join(outputDir, 'media')).sort()).toEqual([stillId, movieId].sort());
    const [still, movie] = result.artifacts;
    expect(still).toMatchObject({
      id: stillId,
      featured: false,
      fullResolution: null,
      originalImage: { url: stillUrl, width: 4096, height: 2048 },
    });
    expect(movie).toMatchObject({
      id: movieId,
      featured: true,
      fullResolution: { url: moviePosterUrl, width: 64, height: 36 },
      mediaPaths: { spriteSheet: `/media/${movieId}/frames.webp` },
    });
    expect(still.mediaPaths).not.toHaveProperty('spriteSheet');
    for (const artifact of result.artifacts) {
      expect(await sharp(readOutput(artifact.mediaPaths.preview)).metadata()).toMatchObject({
        format: 'webp',
        ...(artifact.id === stillId ? { width: 1280, height: 640 } : { width: 64, height: 36 }),
      });
      expect(await sharp(readOutput(artifact.mediaPaths.thumbnail)).metadata()).toMatchObject({
        format: 'png',
        width: 48,
        height: 27,
      });
    }
    expectFeaturePack(still.mediaPaths.features, 5, 1);
    expectFeaturePack(movie.mediaPaths.features, 8, 48);
    expect(await sharp(readOutput(`/media/${movieId}/frames.webp`)).metadata()).toMatchObject({
      format: 'webp',
      width: 2560,
      height: 1080,
    });
  }, 60_000);

  it('leaves the prior catalog and media intact if a later image fetch fails', async () => {
    const oldPreviewPath = `/media/${stillId}/preview.webp`;
    writePreviousOutput(stillId);
    const image = await png(64, 36);
    const fetchImage = vi.fn(async (url: string) => {
      if (url === stillUrl) return image;
      throw new Error('Synthetic fetch failure');
    });

    await expect(
      buildCatalog(fixtureSources, date, outputDir, { fetchImage, sampleFrames: async () => null }),
    ).rejects.toThrow();

    expect(fetchImage).toHaveBeenCalledWith(moviePosterUrl);
    expect(readOutput('catalog.json').toString('utf8')).toBe(previousCatalog);
    expect(readOutput(oldPreviewPath)).toEqual(previousPreview);
    expect(readdirSync(join(outputDir, 'media'))).toEqual([stillId]);
    expect(readdirSync(join(outputDir, 'media', stillId))).toEqual(['preview.webp']);
    expect(readOutput('staticwebapp.config.json').toString('utf8')).toBe(config);
  });

  it('restores the previous media when publishing the new catalog fails after installing media', async () => {
    writePreviousOutput('stale-artifact');
    const image = await png(64, 36);
    const sources = fixtureSources.filter(({ id }) => id === 860409);
    const { rename: realRename } =
      await vi.importActual<typeof import('node:fs/promises')>('node:fs/promises');
    let staging = '';
    const failCatalogRename = vi.fn(
      async (from: Parameters<typeof rename>[0], to: Parameters<typeof rename>[1]) => {
        if (to === join(outputDir, 'catalog.json')) {
          staging = dirname(String(from));
          expect(readdirSync(join(outputDir, 'media'))).toEqual([stillId]);
          throw new Error('Synthetic catalog publication failure');
        }
        await realRename(from, to);
      },
    );

    await vi.mocked(rename).withImplementation(failCatalogRename, async () => {
      await expect(
        buildCatalog(sources, date, outputDir, { fetchImage: async () => image }),
      ).rejects.toThrow('Synthetic catalog publication failure');
    });

    expect(readOutput('catalog.json').toString('utf8')).toBe(previousCatalog);
    expect(readdirSync(join(outputDir, 'media'))).toEqual(['stale-artifact']);
    expect(readOutput('/media/stale-artifact/preview.webp')).toEqual(previousPreview);
    expect(staging).toContain('.catalog-');
    expect(existsSync(staging)).toBe(false);
  });

  it('publishes a first catalog using the default HTTP image fetch', async () => {
    const image = await png(64, 36);
    const fetch = vi.fn(async () => new Response(new Uint8Array(image)));
    vi.stubGlobal('fetch', fetch);
    const sources = fixtureSources.filter(({ id }) => id === 860409);
    const destination = join(outputDir, 'new-public');

    const catalog = await buildCatalog(sources, date, destination);

    expect(fetch).toHaveBeenCalledWith(
      stillUrl,
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
    expect(JSON.parse(readFileSync(join(destination, 'catalog.json'), 'utf8'))).toEqual(catalog);
    expect(catalog.artifacts).toMatchObject([
      { id: stillId, fullResolution: { url: stillUrl, width: 64, height: 36 } },
    ]);
    expect(readdirSync(join(destination, 'media', stillId)).sort()).toEqual([
      'features.bin',
      'preview.webp',
      'thumbnail.png',
    ]);
  });

  it('removes media and propagates the original error if first publication fails', async () => {
    const image = await png(64, 36);
    const sources = fixtureSources.filter(({ id }) => id === 860409);
    const failure = new Error('Synthetic first-publication failure');
    const { rename: realRename } =
      await vi.importActual<typeof import('node:fs/promises')>('node:fs/promises');

    await vi.mocked(rename).withImplementation(
      async (from, to) => {
        if (to === join(outputDir, 'catalog.json')) {
          expect(readdirSync(join(outputDir, 'media'))).toEqual([stillId]);
          throw failure;
        }
        await realRename(from, to);
      },
      async () => {
        await expect(
          buildCatalog(sources, date, outputDir, { fetchImage: async () => image }),
        ).rejects.toBe(failure);
      },
    );

    expect(readdirSync(outputDir)).toEqual(['staticwebapp.config.json']);
  });

  it('propagates an unexpected backup error without changing the previous output', async () => {
    writePreviousOutput('stale-artifact');
    const image = await png(64, 36);
    const sources = fixtureSources.filter(({ id }) => id === 860409);
    const failure = Object.assign(new Error('Synthetic backup permission error'), {
      code: 'EACCES',
    });
    const { rename: realRename } =
      await vi.importActual<typeof import('node:fs/promises')>('node:fs/promises');

    await vi.mocked(rename).withImplementation(
      async (from, to) => {
        if (from === join(outputDir, 'media')) throw failure;
        await realRename(from, to);
      },
      async () => {
        await expect(
          buildCatalog(sources, date, outputDir, { fetchImage: async () => image }),
        ).rejects.toBe(failure);
      },
    );

    expect(readOutput('catalog.json').toString('utf8')).toBe(previousCatalog);
    expect(readdirSync(join(outputDir, 'media'))).toEqual(['stale-artifact']);
    expect(readOutput('/media/stale-artifact/preview.webp')).toEqual(previousPreview);
  });

  it('reports the HTTP status and image URL when the default fetch receives an error', async () => {
    const fetch = vi.fn(async () => new Response(null, { status: 503 }));
    vi.stubGlobal('fetch', fetch);
    const sources = fixtureSources.filter(({ id }) => id === 860409);

    await expect(buildCatalog(sources, date, outputDir)).rejects.toThrow(
      `SVS returned HTTP 503 for ${stillUrl}`,
    );
    expect(fetch).toHaveBeenCalledWith(
      stillUrl,
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
    expect(readdirSync(outputDir)).toEqual(['staticwebapp.config.json']);
  });
});

describe('build-catalog CLI', () => {
  it('replays a recorded fixture and writes the catalog and assets without a network request', async () => {
    const project = join(outputDir, 'cli-project');
    const tooling = join(project, 'tools', 'ingest');
    const recorded = join(project, 'tests', 'fixtures', 'svs');
    const publicDir = join(project, 'public');
    mkdirSync(recorded, { recursive: true });
    cpSync(new URL('../../tools/ingest/', import.meta.url), tooling, { recursive: true });
    symlinkSync(
      fileURLToPath(new URL('../../node_modules/', import.meta.url)),
      join(project, 'node_modules'),
      'dir',
    );

    const gallery = JSON.parse(readFileSync(new URL('40509.json', fixtures), 'utf8'));
    const group = gallery.media_groups[1];
    const card = group.items[0];
    expect(card.instance.id).toBe(860409);
    const root = {
      id: 40467,
      media_groups: [{ items: [{ type: 'gallery_page', instance: { id: 40509 } }] }],
    };
    writeFileSync(join(recorded, '40467.json'), JSON.stringify(root));
    writeFileSync(
      join(recorded, '40509.json'),
      JSON.stringify({ ...gallery, media_groups: [{ ...group, items: [card] }] }),
    );
    writeFileSync(join(recorded, 'manifest.json'), JSON.stringify({ retrievedOn: date }));
    writeFileSync(join(project, 'image.png'), await png(64, 36));

    const preload = join(project, 'offline-fetch.mjs');
    writeFileSync(
      preload,
      `
import { readFile } from 'node:fs/promises';
globalThis.fetch = async (url) => {
  if (url !== ${JSON.stringify(stillUrl)}) throw new Error('Unexpected URL: ' + url);
  return new Response(await readFile(new URL('./image.png', import.meta.url)));
};
`,
    );

    const cli = spawnSync(
      process.execPath,
      ['--import', preload, join(tooling, 'build-catalog.mjs')],
      {
        cwd: project,
        encoding: 'utf8',
        timeout: 30_000,
      },
    );
    if (cli.error) throw cli.error;
    expect(cli.status, `${cli.stdout}\n${cli.stderr}`).toBe(0);
    const catalog = JSON.parse(readFileSync(join(publicDir, 'catalog.json'), 'utf8'));
    expect(catalog).toMatchObject({
      retrievedOn: date,
      artifacts: [{ id: stillId, fullResolution: { url: stillUrl, width: 64, height: 36 } }],
      excludedSources: [],
    });
    expect(readdirSync(join(publicDir, 'media', stillId)).sort()).toEqual([
      'features.bin',
      'preview.webp',
      'thumbnail.png',
    ]);
  }, 40_000);
});
