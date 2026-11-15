import { describe, expect, it } from 'vitest';
import { createListeningImage } from '../../src/engine/listening-image.js';

class ImageStub extends EventTarget {
  readonly style: Record<string, string> = {};
  readonly sources: string[] = [];
  alt = '';

  get src(): string {
    return this.sources.at(-1) ?? '';
  }

  set src(url: string) {
    this.sources.push(url);
  }
}

const arcticArtifact = {
  altText:
    'A map centered on the North Pole shows Arctic sea ice in white and pale blue, surrounded by black open water and gray land.',
  mediaPaths: { preview: '/media/svs-media-860416-main/preview.webp' },
  fullResolution: {
    url: 'https://svs.gsfc.nasa.gov/images/gallery/EarthNowDashboard/WorldView_Arctic.png',
    width: 2136,
    height: 2048,
  },
};

function makeImage(artifact: Parameters<typeof createListeningImage>[1]) {
  const images: ImageStub[] = [];
  const createElement = (tag: string) => {
    expect(tag).toBe('img');
    const image = new ImageStub();
    images.push(image);
    return image;
  };
  const shown = createListeningImage(
    { createElement } as unknown as Document,
    artifact,
  ) as unknown as ImageStub;
  return { shown, preloads: images.filter((image) => image !== shown) };
}

describe('listening image fallback', () => {
  it('shows the local WebP while loading NASA and upgrades only after a successful load', () => {
    const { shown, preloads } = makeImage(arcticArtifact);

    expect(shown.sources).toEqual([arcticArtifact.mediaPaths.preview]);
    expect(shown.alt).toBe(arcticArtifact.altText);
    expect(preloads).toHaveLength(1);
    expect(preloads[0].sources).toEqual([arcticArtifact.fullResolution.url]);

    preloads[0].dispatchEvent(new Event('load'));

    expect(shown.sources).toEqual([
      arcticArtifact.mediaPaths.preview,
      arcticArtifact.fullResolution.url,
    ]);
    expect(shown.alt).toBe(arcticArtifact.altText);
    expect(shown.style.objectFit).toBe('contain');
  });

  it('leaves the local preview in place if the detached request fails', () => {
    const { shown, preloads } = makeImage(arcticArtifact);
    expect(preloads).toHaveLength(1);

    preloads[0].dispatchEvent(new Event('error'));

    expect(shown.sources).toEqual([arcticArtifact.mediaPaths.preview]);
    expect(shown.alt).toBe(arcticArtifact.altText);
  });

  it('reverts once if the on-screen NASA source fails after an upgrade', () => {
    const { shown, preloads } = makeImage(arcticArtifact);
    expect(preloads).toHaveLength(1);
    preloads[0].dispatchEvent(new Event('load'));
    expect(shown.src).toBe(arcticArtifact.fullResolution.url);

    shown.dispatchEvent(new Event('error'));
    expect(shown.src).toBe(arcticArtifact.mediaPaths.preview);
    expect(shown.alt).toBe(arcticArtifact.altText);

    const sources = [
      arcticArtifact.mediaPaths.preview,
      arcticArtifact.fullResolution.url,
      arcticArtifact.mediaPaths.preview,
    ];
    shown.dispatchEvent(new Event('error'));
    expect(shown.sources).toEqual(sources);

    preloads[0].dispatchEvent(new Event('load'));
    expect(shown.sources).toEqual(sources);
  });

  it('uses a local-only preview without starting a detached load or retrying on error', () => {
    const { shown, preloads } = makeImage({ ...arcticArtifact, fullResolution: null });

    expect(preloads).toEqual([]);
    expect(shown.sources).toEqual([arcticArtifact.mediaPaths.preview]);
    shown.dispatchEvent(new Event('error'));
    expect(shown.sources).toEqual([arcticArtifact.mediaPaths.preview]);
    expect(shown.alt).toBe(arcticArtifact.altText);
  });
});
