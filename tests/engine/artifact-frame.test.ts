import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { drawArtifactFrame } from '../../src/engine/artifact-frame.js';
import {
  clearFramebuffer,
  createFramebuffer,
  type Framebuffer,
} from '../../src/engine/framebuffer.js';

const centerX = 144;
const floorY = 142;
const backing = 2;
const thumbnailWidth = 48;
const thumbnailHeight = 27;
const thumbnailLeft = centerX - 24;
const thumbnailTop = floorY - 44;
const sampleTicks = [0, 1, 2, 3, 4, 6, 8, 12, 16, 20, 24, 30, 40, 50, 60, 70];

type Focus = { tick: number; pulse: boolean; sparkles: boolean };

function makeThumbnail(): Uint8Array {
  return Uint8Array.from(
    { length: thumbnailWidth * thumbnailHeight },
    (_, index) => 8 + (index % 3),
  );
}

function render(focus: Focus | null, center = centerX, thumbnail = makeThumbnail()): Framebuffer {
  const frame = createFramebuffer();
  clearFramebuffer(frame, backing);
  drawArtifactFrame(frame, center, floorY, thumbnail, focus);
  return frame;
}

function row(frame: Framebuffer, y: number, x = 0, width = frame.width): Uint8Array {
  const start = y * frame.width + x;
  return frame.pixels.slice(start, start + width);
}

function expectThumbnail(frame: Framebuffer, thumbnail: Uint8Array): void {
  for (let y = 0; y < thumbnailHeight; y += 1) {
    const start = y * thumbnailWidth;
    expect(row(frame, thumbnailTop + y, thumbnailLeft, thumbnailWidth)).toEqual(
      thumbnail.slice(start, start + thumbnailWidth),
    );
  }
}

function topOutline(frame: Framebuffer, inactive: Framebuffer): number {
  for (let y = thumbnailTop - 1; y >= thumbnailTop - 16; y -= 1) {
    const stripe = row(frame, y, centerX - 20, 41);
    const previous = row(inactive, y, centerX - 20, 41);
    if (stripe.every((index, x) => index === stripe[0] && index !== previous[x])) return y;
  }
  return -1;
}

function diamond(frame: Framebuffer, aboveY: number) {
  const rows = Array.from({ length: aboveY }, (_, y) => {
    const occupied = [...row(frame, y).keys()].filter(
      (x) => frame.pixels[y * frame.width + x] !== backing,
    );
    return { y, occupied };
  }).filter(({ occupied }) => occupied.length > 0);

  const widths = rows.map(({ occupied }) => occupied.length);
  return { rows, widths, top: rows[0]?.y };
}

describe('artifact frame', () => {
  it.each([
    {
      view: 'centered inactive',
      center: centerX,
      focus: null,
      expected: '4395ce2009c22a4878142404b8dbb0c43f97bfd2dabadb553b8e57d837baadd9',
    },
    {
      view: 'centered bright',
      center: centerX,
      focus: { tick: 0, pulse: true, sparkles: true },
      expected: 'd95be6e7984f71eebad551a853a7227e96e60e10fd4797470a73e90c554aa0d8',
    },
    {
      view: 'centered quiet with shifted cues',
      center: centerX,
      focus: { tick: 31, pulse: false, sparkles: true },
      expected: 'a7dddf238739ade2af534caef0a92d25b71c8ef97039164232d576fa3a555171',
    },
    {
      view: 'left-clipped without sparkles',
      center: 5.3,
      focus: { tick: 24, pulse: true, sparkles: false },
      expected: '3188debeac122e460eee8a31ff42ef9eca914b43dfbf8c1457964bedd8155af7',
    },
    {
      view: 'right-clipped',
      center: 317.6,
      focus: { tick: 16, pulse: false, sparkles: true },
      expected: '4dff93c50da7eb9b21dd7c9bf95f772633a507316e7d24446d097d7a0f1f524c',
    },
  ])('matches the native indexed $view frame', ({ center, focus, expected }) => {
    const thumbnail = Uint8Array.from({ length: thumbnailWidth * thumbnailHeight }, (_, index) => {
      const x = index % thumbnailWidth;
      const y = Math.floor(index / thumbnailWidth);
      return 5 + ((x * 3 + y * 7) % 11);
    });
    const frame = render(focus, center, thumbnail);

    expect(createHash('sha256').update(frame.pixels).digest('hex')).toBe(expected);
  });

  it.each([-72, 372])('leaves every pixel intact when the artifact is offscreen at x=%i', (x) => {
    const frame = createFramebuffer();
    clearFramebuffer(frame, backing);
    const previous = frame.pixels.slice();
    const focus = { tick: 0, pulse: true, sparkles: true };

    expect(() => drawArtifactFrame(frame, x, 218, makeThumbnail(), focus)).not.toThrow();
    expect(frame.pixels).toEqual(previous);
  });

  it('preserves the native thumbnail, with a border and a post ending at the floor', () => {
    const thumbnail = makeThumbnail();
    const unchanged = thumbnail.slice();
    const frame = render(null, centerX, thumbnail);

    expectThumbnail(frame, unchanged);
    expect(thumbnail).toEqual(unchanged);
    expect(
      row(frame, thumbnailTop - 1, thumbnailLeft, thumbnailWidth).every((v) => v !== backing),
    ).toBe(true);
    expect(row(frame, thumbnailTop, thumbnailLeft - 1, 1)[0]).not.toBe(backing);
    expect(row(frame, thumbnailTop, thumbnailLeft + thumbnailWidth, 1)[0]).not.toBe(backing);
    expect(row(frame, floorY - 1, centerX, 1)[0]).not.toBe(backing);
    expect(row(frame, floorY).every((index) => index === backing)).toBe(true);
    expect(frame.pixels[0]).toBe(backing);
  });

  it('clips the native thumbnail at the viewport edge without wrapping into another row', () => {
    const partialCenter = 5;
    const thumbnail = makeThumbnail();
    const frame = render(null, partialCenter, thumbnail);
    const clipped = 24 - partialCenter;
    const visible = thumbnailWidth - clipped;

    for (let y = 0; y < thumbnailHeight; y += 1) {
      const start = y * thumbnailWidth;
      expect(row(frame, thumbnailTop + y, 0, visible)).toEqual(
        thumbnail.slice(start + clipped, start + thumbnailWidth),
      );
      expect(row(frame, thumbnailTop + y, frame.width - 1, 1)[0]).toBe(backing);
    }
  });

  it('adds a two-pixel outline whose appearance changes with pulse', () => {
    const inactive = render(null);
    const bright = render({ tick: 0, pulse: true, sparkles: false });
    const quiet = render({ tick: 0, pulse: false, sparkles: false });
    const lowerStripe = topOutline(bright, inactive);

    expect(lowerStripe).toBeGreaterThanOrEqual(1);
    const stripe = row(bright, lowerStripe, centerX - 20, 41);
    expect(row(bright, lowerStripe - 1, centerX - 20, 41)).toEqual(stripe);
    expect(row(quiet, lowerStripe, centerX - 20, 41)).not.toEqual(stripe);
    expectThumbnail(bright, makeThumbnail());
    expectThumbnail(quiet, makeThumbnail());
  });

  it('keeps a centered diamond above the frame and bobs it with sparkles disabled', () => {
    const inactive = render(null);
    const first = render({ tick: 0, pulse: true, sparkles: false });
    const outline = topOutline(first, inactive);
    expect(outline).toBeGreaterThanOrEqual(1);
    const cutoff = outline - 1;
    const initial = diamond(first, cutoff);

    expect(initial.widths[0]).toBe(1);
    expect(initial.widths.at(-1)).toBe(1);
    expect(Math.max(...initial.widths)).toBeGreaterThanOrEqual(5);
    expect(initial.widths).toEqual(initial.widths.slice().reverse());
    for (const { occupied } of initial.rows) {
      expect(occupied.at(-1)! - occupied[0] + 1).toBe(occupied.length);
      expect((occupied[0] + occupied.at(-1)!) / 2).toBe(centerX);
    }

    const tops = new Set<number | undefined>();
    for (const tick of sampleTicks) {
      const current = diamond(render({ tick, pulse: true, sparkles: false }), cutoff);
      expect(current.widths).toEqual(initial.widths);
      tops.add(current.top);
    }

    expect(tops.size).toBeGreaterThan(1);
  });

  it('removes only the extra spark pixels when sparkles are disabled', () => {
    let sparkCount = 0;
    const thumbnail = makeThumbnail();
    for (const tick of sampleTicks) {
      const off = render({ tick, pulse: true, sparkles: false }, centerX, thumbnail);
      const on = render({ tick, pulse: true, sparkles: true }, centerX, thumbnail);
      for (const [offset, index] of on.pixels.entries()) {
        if (index === off.pixels[offset]) continue;
        expect(off.pixels[offset]).toBe(backing);
        sparkCount += 1;
      }
      expectThumbnail(on, makeThumbnail());
    }

    expect(sparkCount).toBeGreaterThan(0);
    expect(thumbnail).toEqual(makeThumbnail());
  });
});
