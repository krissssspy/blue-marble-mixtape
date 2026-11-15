import { describe, expect, it } from 'vitest';
import { drawText } from '../../src/engine/font.js';
import { clearFramebuffer, createFramebuffer } from '../../src/engine/framebuffer.js';

const ink = 5;
const backing = 2;

function raster(text: string, x = 0, y = 0) {
  const frame = createFramebuffer();
  clearFramebuffer(frame, backing);
  drawText(frame, text, x, y, ink);
  return frame;
}

function signature(glyph: string): string {
  return raster(glyph)
    .pixels.slice(0, 320 * 16)
    .join('');
}

describe('indexed bitmap font', () => {
  it('draws a distinct 16-pixel A and preserves backing pixels', () => {
    const x = 13;
    const y = 8;
    const frame = raster('A', x, y);
    const glyph = ['01110', '10001', '10001', '11111', '10001', '10001', '10001', '10001'];
    const pixels = glyph.flatMap((row) => {
      const doubled = [...row].flatMap((cell) => [cell, cell]);
      return [doubled, doubled];
    });

    const region = Array.from({ length: 18 }, (_, row) => {
      const start = (y + row - 1) * frame.width + x - 1;
      return [...frame.pixels.slice(start, start + 12)];
    });
    const padding = Array<number>(12).fill(backing);

    expect(region).toEqual([
      padding,
      ...pixels.map((row) => [
        backing,
        ...row.map((cell) => (cell === '1' ? ink : backing)),
        backing,
      ]),
      padding,
    ]);
  });

  it('leaves blank spaces and advances one line by 16 internal pixels', () => {
    const actual = raster('A A\nA', 12, 24);
    const expected = raster('A', 12, 24);
    drawText(expected, 'A', 36, 24, ink);
    drawText(expected, 'A', 12, 40, ink);

    expect(actual.pixels).toEqual(expected.pixels);
  });

  it('gives the supported characters distinct, visible glyphs', () => {
    const glyphs = [..."ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789?!.,-:'/%+←↑→↓"];
    const signatures = glyphs.map(signature);

    const blank = signature(' ');

    expect(signatures).not.toContain(blank);
    expect(new Set(signatures).size).toBe(glyphs.length);
  });

  it('uses arrowheads at the leading ends of the four arrow glyphs', () => {
    function arrowBox(glyph: string) {
      const frame = raster(glyph);
      const points = [...frame.pixels.entries()]
        .filter(([, index]) => index === ink)
        .map(([offset]) => [offset % frame.width, Math.floor(offset / frame.width)]);
      const xs = points.map(([x]) => x);
      const ys = points.map(([, y]) => y);
      const left = Math.min(...xs);
      const right = Math.max(...xs);
      const top = Math.min(...ys);
      const bottom = Math.max(...ys);
      return { points, left, right, top, bottom };
    }

    const leftArrow = arrowBox('←');
    const rightArrow = arrowBox('→');
    const upArrow = arrowBox('↑');
    const downArrow = arrowBox('↓');

    expect(leftArrow.right - leftArrow.left).toBeGreaterThanOrEqual(
      leftArrow.bottom - leftArrow.top,
    );
    expect(rightArrow.right - rightArrow.left).toBeGreaterThanOrEqual(
      rightArrow.bottom - rightArrow.top,
    );
    expect(upArrow.bottom - upArrow.top).toBeGreaterThanOrEqual(upArrow.right - upArrow.left);
    expect(downArrow.bottom - downArrow.top).toBeGreaterThanOrEqual(
      downArrow.right - downArrow.left,
    );

    expect(leftArrow.points.filter(([x]) => x === leftArrow.left + 2).length).toBeGreaterThan(
      leftArrow.points.filter(([x]) => x === leftArrow.right).length,
    );
    expect(upArrow.points.filter(([, y]) => y === upArrow.top + 2).length).toBeGreaterThan(
      upArrow.points.filter(([, y]) => y === upArrow.bottom).length,
    );

    const leftMirror = leftArrow.points.map(([x, y]) => [leftArrow.right - x, y - leftArrow.top]);
    const rightShape = rightArrow.points.map(([x, y]) => [x - rightArrow.left, y - rightArrow.top]);
    const upMirror = upArrow.points.map(([x, y]) => [x - upArrow.left, upArrow.bottom - y]);
    const downShape = downArrow.points.map(([x, y]) => [x - downArrow.left, y - downArrow.top]);

    expect(new Set(leftMirror.map(String))).toEqual(new Set(rightShape.map(String)));
    expect(new Set(upMirror.map(String))).toEqual(new Set(downShape.map(String)));
  });
});
