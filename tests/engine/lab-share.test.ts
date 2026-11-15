import { describe, expect, it } from 'vitest';
import { DEFAULT_RECIPE } from '../../src/audio/recipe.js';
import { encodeLabShare, readLabShare } from '../../src/engine/lab-share.js';

const mix = {
  artifactId: 'svs-page-2008-365262',
  recipe: { ...DEFAULT_RECIPE, scan: 'spiral', voice: 'bell' } as const,
};

describe('Lab share links', () => {
  it('round-trips all settings and the source through a portable URL fragment', () => {
    const fragment = encodeLabShare(mix);
    expect(fragment).toMatch(/^#mix=/);
    expect(readLabShare(new URL(fragment, 'https://example.test/museum').hash)).toEqual(mix);
    expect(encodeLabShare(mix)).toBe(fragment);
  });

  it.each(['', '#credits', '#mix=%', '#mix=not-json', '#mix=null'])(
    'rejects invalid fragment %s',
    (hash) => {
      expect(readLabShare(hash)).toBeNull();
    },
  );

  it('rejects malformed artifact IDs and invalid or incomplete recipes', () => {
    for (const candidate of [
      { ...mix, artifactId: '' },
      { ...mix, artifactId: '/outside.png' },
      { ...mix, recipe: { voice: 'bell' } },
      { ...mix, recipe: { ...mix.recipe, scan: 'unsupported' } },
    ]) {
      expect(readLabShare('#mix=' + encodeURIComponent(JSON.stringify(candidate)))).toBeNull();
    }
  });
});
