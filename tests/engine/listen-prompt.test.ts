import { describe, expect, it } from 'vitest';
import { drawText } from '../../src/engine/font.js';
import {
  clearFramebuffer,
  createFramebuffer,
  type Framebuffer,
} from '../../src/engine/framebuffer.js';
import { drawListenPrompt } from '../../src/engine/listen-prompt.js';
import { STRINGS } from '../../src/strings.js';

const promptTop = 36;

function render(centerX: number, backing: number): Framebuffer {
  const frame = createFramebuffer();
  clearFramebuffer(frame, backing);
  drawListenPrompt(frame, centerX, promptTop);
  return frame;
}

function promptBounds(frame: Framebuffer, backing: number) {
  const points = [...frame.pixels.entries()]
    .filter(([, pixel]) => pixel !== backing)
    .map(([offset]) => ({ x: offset % frame.width, y: Math.floor(offset / frame.width) }));
  const left = Math.min(...points.map(({ x }) => x));
  const right = Math.max(...points.map(({ x }) => x));
  const top = Math.min(...points.map(({ y }) => y));
  const bottom = Math.max(...points.map(({ y }) => y));
  const pixels = Array.from({ length: bottom - top + 1 }, (_, row) => {
    const start = (top + row) * frame.width + left;
    return [...frame.pixels.slice(start, start + right - left + 1)];
  });

  return { left, right, top, bottom, pixels };
}

function findLabel(frame: Framebuffer, bounds: ReturnType<typeof promptBounds>, text: string) {
  const stencil = createFramebuffer();
  drawText(stencil, text, 0, 0, 1);
  const width = [...text].length * 12 - 2;
  const glyphHeight = 16;
  const stencilPixels = Array.from({ length: glyphHeight }, (_, row) =>
    stencil.pixels.slice(row * stencil.width, row * stencil.width + width),
  );
  const backingColumn = stencilPixels[0].indexOf(0);

  for (let y = bounds.top; y + glyphHeight <= bounds.bottom + 1; y += 1) {
    for (let x = bounds.left; x + width <= bounds.right + 1; x += 1) {
      const backing = frame.pixels[y * frame.width + x + backingColumn];
      if (backing >= 5) continue;
      const matches = stencilPixels.every((row, dy) =>
        row.every((ink, dx) => {
          const pixel = frame.pixels[(y + dy) * frame.width + x + dx];
          return ink ? pixel >= 5 : pixel === backing;
        }),
      );

      if (matches) return { x, y, width };
    }
  }
}

describe('cassette listen prompt', () => {
  it('draws both centered lines in full on an opaque panel', () => {
    const frame = render(160, 15);
    const bounds = promptBounds(frame, 15);
    const [question, answers] = STRINGS.listen.split('\n');
    const label = findLabel(frame, bounds, question);
    const hints = findLabel(frame, bounds, answers);
    const alternate = render(160, 13);
    const alternateBounds = promptBounds(alternate, 13);

    expect(label).toBeDefined();
    expect(hints).toBeDefined();
    const first = label!;
    const second = hints!;
    expect(second.y).toBeGreaterThanOrEqual(first.y + 16);
    expect(Math.abs(first.x + first.width / 2 - 160)).toBeLessThanOrEqual(3);
    expect(Math.abs(second.x + second.width / 2 - 160)).toBeLessThanOrEqual(3);
    expect(findLabel(alternate, alternateBounds, question)).toEqual(first);
    expect(findLabel(alternate, alternateBounds, answers)).toEqual(second);
    expect(bounds.top).toBeGreaterThanOrEqual(promptTop);
    expect(bounds.left).toBeGreaterThan(0);
    expect(bounds.right).toBeLessThan(frame.width - 1);
    expect(bounds.bottom).toBeLessThan(frame.height - 1);
  });

  it('keeps the opaque backing inset from a continuous slate outline', () => {
    const untouched = 15;
    const slate = 12;
    const backing = 1;
    const frame = render(160, untouched);
    const { pixels, top, bottom } = promptBounds(frame, untouched);
    const horizontalTrim = Array<number>(pixels[0].length).fill(slate);

    expect(pixels[0]).toEqual(horizontalTrim);
    expect(pixels.at(-1)).toEqual(horizontalTrim);
    expect(pixels.map((row) => [row[0], row.at(-1)])).toEqual(
      Array.from({ length: pixels.length }, () => [slate, slate]),
    );
    expect(pixels[2][2]).toBe(backing);
    expect(pixels.at(-3)?.at(-3)).toBe(backing);

    const exteriorRows = [promptTop - 1, frame.height - 1];
    for (const y of exteriorRows) {
      const start = y * frame.width;
      expect(
        frame.pixels.slice(start, start + frame.width).every((pixel) => pixel === untouched),
      ).toBe(true);
    }
    for (let y = top; y <= bottom; y += 1) {
      const start = y * frame.width;
      expect([frame.pixels[start], frame.pixels[start + frame.width - 1]]).toEqual([
        untouched,
        untouched,
      ]);
    }
  });

  it.each([2, 318])('keeps the whole panel and both labels in frame near x=%i', (centerX) => {
    const bounds = promptBounds(render(160, 15), 15);
    const edge = promptBounds(render(centerX, 15), 15);

    expect(edge.pixels).toEqual(bounds.pixels);
    expect(edge.top).toBe(bounds.top);
    if (centerX < 160) expect(edge.left).toBeLessThan(bounds.left);
    else expect(edge.right).toBeGreaterThan(bounds.right);
  });
});
