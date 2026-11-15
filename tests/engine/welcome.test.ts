import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { drawText } from '../../src/engine/font.js';
import {
  clearFramebuffer,
  createFramebuffer,
  fillRect,
  type Framebuffer,
} from '../../src/engine/framebuffer.js';
import { drawWelcome } from '../../src/engine/welcome.js';

const cream = 5;
const gold = 6;

function pixel(frame: Framebuffer, x: number, y: number): number {
  return frame.pixels[y * frame.width + x];
}

function welcomeFrame(): Framebuffer {
  const frame = createFramebuffer();
  clearFramebuffer(frame, 15);
  drawWelcome(frame);
  return frame;
}

function region(frame: Framebuffer, left: number, top: number, width: number, height: number) {
  return Array.from({ length: height }, (_, row) => {
    const start = (top + row) * frame.width + left;
    return [...frame.pixels.slice(start, start + width)];
  });
}

describe('Welcome frame', () => {
  it('matches the reviewed 320×180 indexed title frame', () => {
    const frame = welcomeFrame();

    expect([frame.width, frame.height]).toEqual([320, 180]);
    expect(createHash('sha256').update(frame.pixels).digest('hex')).toBe(
      '96a69c8ed808aeb153774ef7a2cf244f2cc488711e0e8232e9c1001d8e27b73d',
    );
  });

  it('draws the centered cassette and its two-line label on an opaque panel', () => {
    const frame = welcomeFrame();
    const exterior = pixel(frame, 12, 16);
    const cassette = pixel(frame, 160, 16);

    expect(cassette).not.toBe(exterior);
    expect(pixel(frame, 70, 16)).toBe(cassette);
    expect(pixel(frame, 250, 16)).toBe(cassette);
    expect(pixel(frame, 308, 16)).toBe(exterior);

    const left = 66;
    const top = 22;
    const width = 188;
    const height = 45;
    const label = region(frame, left, top, width, height);
    const backing = label[0][0];
    expect(backing).toBeLessThan(5);

    const expected = createFramebuffer();
    fillRect(expected, left, top, width, height, backing);
    const lines = [
      ['BLUE MARBLE', cream],
      ['MIXTAPE', gold],
    ] as const;
    const firstLineTop = label.findIndex((row) => row.includes(cream));
    const secondLineTop = label.findIndex((row) => row.includes(gold));
    expect(secondLineTop).toBeGreaterThanOrEqual(firstLineTop + 16);

    for (const [text, ink] of lines) {
      const firstRow = label.findIndex((row) => row.includes(ink));
      expect(firstRow).toBeGreaterThanOrEqual(0);
      const columns = label.flatMap((row) =>
        row.flatMap((value, column) => (value === ink ? [column] : [])),
      );
      const min = Math.min(...columns) + left;
      const max = Math.max(...columns) + left;
      expect(Math.abs((min + max) / 2 - 160)).toBeLessThanOrEqual(3);
      drawText(expected, text, min, top + firstRow, ink);
    }

    expect(label).toEqual(region(expected, left, top, width, height));
  });

  it('holds one centered Earth in a dark window with empty space on both sides', () => {
    const frame = welcomeFrame();
    const left = 116;
    const top = 84;
    const window = region(frame, left, top, 88, 34);
    const backing = window[0][0];
    expect(backing).toBeLessThan(5);

    const globe = window.flatMap((row) =>
      row.flatMap((value, x) => (value !== backing ? [{ x: left + x, value }] : [])),
    );
    const globeColors = new Set(globe.map(({ value }) => value));

    expect(globe.length).toBeGreaterThan(400);
    expect(globeColors.size).toBeGreaterThanOrEqual(2);
    expect(globeColors.has(8) || globeColors.has(9)).toBe(true);
    expect(globe.every(({ x }) => x >= 140 && x <= 180)).toBe(true);
    expect(
      Math.abs(
        (Math.min(...globe.map(({ x }) => x)) + Math.max(...globe.map(({ x }) => x))) / 2 - 160,
      ),
    ).toBeLessThanOrEqual(2);
  });

  it('shows the up-arrow start hint on an opaque dark panel below the cassette', () => {
    const frame = welcomeFrame();
    const left = 110;
    const top = 141;
    const width = 100;
    const height = 21;
    const hint = region(frame, left, top, width, height);
    const backing = hint[0][0];
    const firstRow = hint.findIndex((row) => row.includes(cream));

    expect(backing).toBeLessThan(5);
    expect(firstRow).toBeGreaterThanOrEqual(0);

    const columns = hint.flatMap((row) =>
      row.flatMap((value, column) => (value === cream ? [column] : [])),
    );
    const expected = createFramebuffer();
    fillRect(expected, left, top, width, height, backing);
    drawText(expected, '↑ START', left + Math.min(...columns), top + firstRow, cream);

    expect(hint).toEqual(region(expected, left, top, width, height));
  });
});
