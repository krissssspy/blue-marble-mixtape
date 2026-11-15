import { readFileSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';
import { loadMuseumAssets } from '../../src/engine/museum-assets.js';

type CatalogFixture = {
  artifacts: {
    featured: boolean;
    mediaPaths: { thumbnail: string; preview: string; features: string };
  }[];
};

const catalog = JSON.parse(
  readFileSync(new URL('../../public/catalog.json', import.meta.url), 'utf8'),
) as CatalogFixture;

const [firstFeatured, nextFeatured] = catalog.artifacts.filter(({ featured }) => featured);
const firstOrdinary = catalog.artifacts.find(({ featured }) => !featured)!;
const practiceThumbnail = new Uint8Array(48 * 27);
practiceThumbnail.set([5, 8, 4, 3]);

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((complete) => {
    resolve = complete;
  });
  return { promise, resolve };
}

describe('loadMuseumAssets', () => {
  it('reports progress after each load and returns the first featured artifact with its thumbnail', async () => {
    const fixture = { ...catalog, artifacts: [firstOrdinary, firstFeatured, nextFeatured] };
    const catalogReady = deferred<Response>();
    const thumbnailRequested = deferred<void>();
    const thumbnailReady = deferred<Uint8Array>();
    const fetchCatalog = vi.fn(() => catalogReady.promise);
    const loadThumbnail = vi.fn(() => {
      thumbnailRequested.resolve();
      return thumbnailReady.promise;
    });
    const onProgress = vi.fn();

    const pending = loadMuseumAssets(fetchCatalog, loadThumbnail, onProgress);
    expect(fetchCatalog.mock.calls).toEqual([['/catalog.json']]);
    expect(onProgress.mock.calls).toEqual([[0]]);
    expect(loadThumbnail).not.toHaveBeenCalled();

    catalogReady.resolve(Response.json(fixture));
    await thumbnailRequested.promise;
    expect(loadThumbnail.mock.calls).toEqual([[firstFeatured.mediaPaths.thumbnail]]);
    expect(onProgress.mock.calls).toEqual([[0], [0.5]]);

    thumbnailReady.resolve(practiceThumbnail);
    await expect(pending).resolves.toEqual({
      catalog: fixture,
      practiceArtifact: firstFeatured,
      practiceThumbnail,
    });
    expect(onProgress.mock.calls).toEqual([[0], [0.5], [1]]);
  });

  it('uses the first artifact when the catalog has no featured artifact', async () => {
    const fixture = {
      ...catalog,
      artifacts: [firstOrdinary, { ...nextFeatured, featured: false }],
    };
    const fetchCatalog = vi.fn(async () => Response.json(fixture));
    const loadThumbnail = vi.fn(async () => practiceThumbnail);

    await expect(loadMuseumAssets(fetchCatalog, loadThumbnail, vi.fn())).resolves.toEqual({
      catalog: fixture,
      practiceArtifact: firstOrdinary,
      practiceThumbnail,
    });
    expect(loadThumbnail.mock.calls).toEqual([[firstOrdinary.mediaPaths.thumbnail]]);
  });

  it('rejects an unsuccessful catalog response even when its body is a valid catalog', async () => {
    const fetchCatalog = vi.fn(async () => Response.json(catalog, { status: 503 }));
    const loadThumbnail = vi.fn(async () => practiceThumbnail);
    const onProgress = vi.fn();

    await expect(loadMuseumAssets(fetchCatalog, loadThumbnail, onProgress)).rejects.toMatchObject({
      message: expect.stringMatching(/catalog/i),
      cause: expect.objectContaining({ message: 'HTTP 503' }),
    });
    expect(loadThumbnail).not.toHaveBeenCalled();
    expect(onProgress.mock.calls).toEqual([[0]]);
  });

  it.each([
    ['empty', { ...catalog, artifacts: [] }],
    ['null', null],
  ])('reports a %s catalog without reaching the ready state', async (_, invalid) => {
    const fetchCatalog = vi.fn(async () => Response.json(invalid));
    const loadThumbnail = vi.fn(async () => practiceThumbnail);
    const onProgress = vi.fn();

    await expect(loadMuseumAssets(fetchCatalog, loadThumbnail, onProgress)).rejects.toMatchObject({
      message: 'The museum catalog has no artifacts.',
    });
    expect(loadThumbnail).not.toHaveBeenCalled();
    expect(onProgress.mock.calls).toEqual([[0]]);
  });

  it('reports missing or nonlocal thumbnail paths without requesting them', async () => {
    const invalidMediaPaths = [
      undefined,
      null,
      { ...firstFeatured.mediaPaths, thumbnail: undefined },
      { ...firstFeatured.mediaPaths, thumbnail: 'https://example.invalid/artifact.png' },
    ];
    for (const mediaPaths of invalidMediaPaths) {
      const artifact = { ...firstFeatured, mediaPaths };
      const fetchCatalog = vi.fn(async () => Response.json({ ...catalog, artifacts: [artifact] }));
      const loadThumbnail = vi.fn(async () => practiceThumbnail);
      const onProgress = vi.fn();

      await expect(loadMuseumAssets(fetchCatalog, loadThumbnail, onProgress)).rejects.toMatchObject(
        {
          message: 'The practice artifact requires a local thumbnail path.',
        },
      );
      expect(loadThumbnail).not.toHaveBeenCalled();
      expect(onProgress).not.toHaveBeenCalledWith(1);
    }
  });

  it('reports a failed thumbnail load without reaching the ready state', async () => {
    const fetchCatalog = vi.fn(async () => Response.json(catalog));
    const failure = new Error('Image service offline');
    const loadThumbnail = vi.fn(async () => {
      throw failure;
    });
    const onProgress = vi.fn();

    await expect(loadMuseumAssets(fetchCatalog, loadThumbnail, onProgress)).rejects.toMatchObject({
      message: expect.stringMatching(/thumbnail/i),
      cause: failure,
    });
    expect(loadThumbnail.mock.calls).toEqual([[firstFeatured.mediaPaths.thumbnail]]);
    expect(onProgress.mock.calls).toEqual([[0], [0.5]]);
  });
});
