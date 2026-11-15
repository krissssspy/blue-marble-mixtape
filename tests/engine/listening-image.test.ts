import { describe, expect, it, vi } from 'vitest';
import { createListeningImage } from '../../src/engine/listening-image.js';

class ImageStub extends EventTarget {
  readonly tagName = 'IMG';
  readonly style: Record<string, string> = {};
  alt = '';
  src = '';
}

const localArtifact = {
  altText:
    'Terra satellite strips show cloud systems and sunlit terrain across part of Earth. Gold outlines mark the boundaries of neighboring satellite passes.',
  mediaPaths: { preview: '/media/svs-media-860409-main/preview.webp' },
  fullResolution: null,
};

describe('createListeningImage', () => {
  it('creates an image with the exact catalog alt text and local preview URL', () => {
    const img = new ImageStub();
    const createElement = vi.fn(() => img);

    const image = createListeningImage({ createElement } as unknown as Document, localArtifact);

    expect(createElement.mock.calls).toEqual([['img']]);
    expect(image).toBe(img);
    expect(image.tagName).toBe('IMG');
    expect(image.alt).toBe(localArtifact.altText);
    expect(image.src).toBe(localArtifact.mediaPaths.preview);
  });

  it('fits the whole image to the available area and keeps scaling smooth', () => {
    const createElement = () => new ImageStub();
    const image = createListeningImage({ createElement } as unknown as Document, localArtifact);

    expect(image.style).toMatchObject({
      width: '100%',
      height: '100%',
      objectFit: 'contain',
      imageRendering: 'auto',
    });
  });
});
