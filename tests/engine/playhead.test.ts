import { describe, expect, it } from 'vitest';
import {
  clearFramebuffer,
  createFramebuffer,
  type Framebuffer,
} from '../../src/engine/framebuffer.js';
import { drawPlayhead, fitImageRect } from '../../src/engine/playhead.js';

const image = { x: 40, y: 30, width: 240, height: 120 };

function render(locations: Parameters<typeof drawPlayhead>[2]): Framebuffer {
  const frame = createFramebuffer();
  clearFramebuffer(frame, 255);
  drawPlayhead(frame, image, locations);
  return frame;
}

function marked(frame: Framebuffer) {
  return [...frame.pixels.entries()].flatMap(([offset, index]) =>
    index === 255 ? [] : [{ x: offset % frame.width, y: Math.floor(offset / frame.width), index }],
  );
}

function markNear(frame: Framebuffer, x: number, y: number, margin = 3): boolean {
  return marked(frame).some((p) => Math.abs(p.x - x) <= margin && Math.abs(p.y - y) <= margin);
}

function expectImageMarks(frame: Framebuffer, landmarks: readonly (readonly [number, number])[]) {
  for (const [x, y] of landmarks) {
    expect(
      markNear(frame, image.x + x * image.width, image.y + y * image.height),
      `${x},${y}`,
    ).toBe(true);
  }
  expect(
    marked(frame).every(
      (p) =>
        p.x >= image.x &&
        p.x < image.x + image.width &&
        p.y >= image.y &&
        p.y < image.y + image.height &&
        p.index >= 0 &&
        p.index < 16,
    ),
  ).toBe(true);
}

describe('fitting the playhead to the NASA image', () => {
  it('centers wide and tall images at contain scale without cropping', () => {
    expect(fitImageRect(320, 180, 400, 100)).toMatchObject({
      x: 0,
      y: 50,
      width: 320,
      height: 80,
    });
    expect(fitImageRect(320, 180, 100, 400)).toMatchObject({
      x: 137.5,
      y: 0,
      width: 45,
      height: 180,
    });
  });

  it('returns no usable fitted area before both natural dimensions are known', () => {
    expect(fitImageRect(320, 180, 0, 90)).toBeNull();
    expect(fitImageRect(320, 180, 120, 0)).toBeNull();
  });
});

describe('location marks in image space', () => {
  it('marks points and straight segments at their normalized positions', () => {
    const frame = render([
      { kind: 'point', x: 0.2, y: 0.75 },
      { kind: 'line', from: { x: 0.4, y: 0.25 }, to: { x: 0.8, y: 0.65 } },
    ]);

    expectImageMarks(frame, [
      [0.2, 0.75],
      [0.4, 0.25],
      [0.6, 0.45],
      [0.8, 0.65],
    ]);
    expect(markNear(frame, image.x + image.width * 0.2, image.y + image.height * 0.5)).toBe(false);
  });

  it('gives a point mark four equally long arms around its mapped center', () => {
    const frame = render([{ kind: 'point', x: 0.2, y: 0.75 }]);
    const centerX = image.x + image.width * 0.2;
    const centerY = image.y + image.height * 0.75;
    const offsets = marked(frame).map(({ x, y }) => [x - centerX, y - centerY]);

    expect(offsets).toEqual([
      [0, -2],
      [0, -1],
      [-2, 0],
      [-1, 0],
      [0, 0],
      [1, 0],
      [2, 0],
      [0, 1],
      [0, 2],
    ]);
  });

  it('draws a round ring using the shorter fitted side as its radius scale', () => {
    const frame = render([{ kind: 'ring', center: { x: 0.5, y: 0.5 }, radius: 0.2 }]);
    const centerX = image.x + image.width / 2;
    const centerY = image.y + image.height / 2;

    expectImageMarks(frame, [
      [0.4, 0.5],
      [0.6, 0.5],
      [0.5, 0.3],
      [0.5, 0.7],
    ]);
    expect(markNear(frame, centerX + 12, centerY)).toBe(false);

    const radius = image.height * 0.2;
    const offsets = marked(frame).map(({ x, y }) => [x - centerX, y - centerY]);
    expect(offsets.every(([x, y]) => Math.abs(Math.hypot(x, y) - radius) <= 1)).toBe(true);

    const angles = offsets.map(([x, y]) => Math.atan2(y, x)).sort((a, b) => a - b);
    angles.push(angles[0] + 2 * Math.PI);
    const arcGaps = angles.slice(1).map((angle, i) => (angle - angles[i]) * radius);
    expect(Math.max(...arcGaps)).toBeLessThanOrEqual(2);
  });

  it('follows every point in a bent path in sequence', () => {
    const frame = render([
      {
        kind: 'path',
        points: [
          { x: 0.15, y: 0.25 },
          { x: 0.4, y: 0.8 },
          { x: 0.8, y: 0.7 },
        ],
      },
    ]);

    expectImageMarks(frame, [
      [0.15, 0.25],
      [0.275, 0.525],
      [0.4, 0.8],
      [0.6, 0.75],
      [0.8, 0.7],
    ]);
    expect(markNear(frame, image.x + image.width * 0.475, image.y + image.height * 0.475)).toBe(
      false,
    );
  });

  it('marks the bounds of a normalized rectangular region', () => {
    const frame = render([{ kind: 'region', x: 0.15, y: 0.2, width: 0.45, height: 0.4 }]);

    expectImageMarks(frame, [
      [0.15, 0.2],
      [0.6, 0.2],
      [0.15, 0.6],
      [0.6, 0.6],
    ]);
    expect(markNear(frame, image.x + image.width * 0.8, image.y + image.height * 0.4)).toBe(false);

    const left = image.x + 0.15 * image.width;
    const right = image.x + 0.6 * image.width;
    const top = image.y + 0.2 * image.height;
    const bottom = image.y + 0.6 * image.height;
    const border = new Set(marked(frame).map(({ x, y }) => `${x},${y}`));

    expect(border.size).toBe(2 * (right - left + bottom - top));
    for (let x = left; x <= right; x += 1) {
      expect(border.has(`${x},${top}`)).toBe(true);
      expect(border.has(`${x},${bottom}`)).toBe(true);
    }
    for (let y = top; y <= bottom; y += 1) {
      expect(border.has(`${left},${y}`)).toBe(true);
      expect(border.has(`${right},${y}`)).toBe(true);
    }
  });

  it('draws edge marks without spilling into the letterbox or cropping an entire edge mark', () => {
    const frame = render([
      { kind: 'point', x: 0, y: 0 },
      { kind: 'point', x: 1, y: 1 },
      { kind: 'ring', center: { x: 1, y: 1 }, radius: 0.2 },
    ]);

    expectImageMarks(frame, [
      [0, 0],
      [1, 1],
      [0.9, 1],
      [1, 0.8],
    ]);
  });

  it('leaves a fresh overlay transparent when there are no active locations', () => {
    expect(render([]).pixels.every((index) => index === 255)).toBe(true);
  });
});
