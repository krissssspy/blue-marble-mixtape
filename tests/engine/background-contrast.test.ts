import { describe, expect, it, vi } from 'vitest';
import {
  assertBackgroundContrast,
  contrastRatio,
  shadeBackdrop,
} from '../../src/engine/background.js';
import { fillRect, type Framebuffer } from '../../src/engine/framebuffer.js';
import { BACKDROP_RAMP } from '../../src/engine/palette.js';

const darkest = '#0b1026';
const lightest = '#24406e';
const cream = '#f4f1de';
const gold = '#ffcc33';
const coral = '#ff6b6b';

const room = {
  backdrop: BACKDROP_RAMP,
  lane: [cream, gold],
  text: [{ foreground: cream, panel: lightest, opaque: true }],
};

describe('room contrast', () => {
  it('calculates relative luminance contrast regardless of color order', () => {
    expect(contrastRatio(darkest, lightest)).toBeCloseTo(1.822, 3);
    expect(contrastRatio(lightest, darkest)).toBeCloseTo(1.822, 3);
    expect(contrastRatio(cream, cream)).toBe(1);
    expect(contrastRatio('#0a0a0a', '#ffffff')).toBeCloseTo(19.7981457, 6);
  });

  it('accepts the full five-tone ramp with a distinct lane and readable opaque text', () => {
    expect(() => assertBackgroundContrast(room)).not.toThrow();
  });

  it('rejects an off-ramp Dusk color even when its contrast is below two', () => {
    expect(() => assertBackgroundContrast({ ...room, backdrop: [darkest, '#5a3e2b'] })).toThrow(
      /#5a3e2b.*outside.*Dusk ramp/i,
    );
  });

  it('rejects a backdrop pair above two even if both colors belong to its ramp', async () => {
    vi.resetModules();
    vi.doMock('../../src/engine/palette.js', async (importOriginal) => ({
      ...(await importOriginal<typeof import('../../src/engine/palette.js')>()),
      BACKDROP_RAMP: [...BACKDROP_RAMP.slice(0, 4), coral],
    }));
    try {
      const { assertBackgroundContrast: check } = await import('../../src/engine/background.js');
      expect(() => check({ backdrop: [darkest, coral], lane: [], text: [] })).toThrow(
        /backdrop.*#0b1026.*#ff6b6b.*2:1/i,
      );
    } finally {
      vi.doUnmock('../../src/engine/palette.js');
      vi.resetModules();
    }
  });

  it('requires each lane color to reach three against the whole supplied backdrop', () => {
    const slate = '#6f82a8';
    expect(() =>
      assertBackgroundContrast({ ...room, backdrop: [darkest], lane: [slate] }),
    ).not.toThrow();
    expect(() => assertBackgroundContrast({ ...room, lane: [cream, slate] })).toThrow(
      /lane.*#6f82a8.*3:1.*#24406e/i,
    );
  });

  it('rejects text below four and a half against its own panel', () => {
    expect(() =>
      assertBackgroundContrast({
        ...room,
        text: [...room.text, { foreground: coral, panel: lightest, opaque: true }],
      }),
    ).toThrow(/opaque panel.*4[.]5:1 contrast/i);
  });

  it('requires an opaque text panel even when its text has high contrast', () => {
    expect(() =>
      assertBackgroundContrast({
        ...room,
        text: [{ foreground: cream, panel: darkest, opaque: false }],
      }),
    ).toThrow(/opaque panel.*4[.]5:1 contrast/i);
  });
});
describe('directional backdrop shading', () => {
  it('gives a solid surface a top-left highlight and bottom-right shadow', () => {
    const frame: Framebuffer = { width: 9, height: 8, pixels: new Uint8Array(72) };
    fillRect(frame, 2, 2, 5, 4, 2);
    fillRect(frame, 4, 0, 1, 1, 3);
    fillRect(frame, 1, 6, 1, 1, 12);
    shadeBackdrop(frame);
    const at = (x: number, y: number) => frame.pixels[y * frame.width + x];
    expect([at(2, 2), at(4, 2), at(2, 4), at(4, 3), at(6, 4), at(4, 5), at(6, 5)]).toEqual([
      3, 3, 3, 2, 1, 1, 1,
    ]);
    expect([at(1, 2), at(7, 4), at(4, 0), at(1, 6)]).toEqual([0, 0, 3, 12]);
  });
});
