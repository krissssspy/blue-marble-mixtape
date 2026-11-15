import { describe, expect, it } from 'vitest';
import { estimateMotion } from '../../tools/ingest/lib/motion.mjs';

function stamp(frame: Uint8Array, width: number, x: number, y: number, pattern: number[][]) {
  for (const [row, pixels] of pattern.entries()) {
    frame.set(pixels, (y + row) * width + x);
  }
}

describe('estimateMotion', () => {
  it.each([0, 147])(
    'returns zero vectors and energy for identical flat frames at luma %i',
    (value) => {
      const frame = new Uint8Array(36).fill(value);
      const result = estimateMotion({ width: 6, height: 6 }, frame, frame);

      expect(result.motionX).toEqual(new Int8Array(36));
      expect(result.motionY).toEqual(new Int8Array(36));
      expect(result.frameDifferenceEnergy).toEqual(new Uint8Array(36));
    },
  );

  it('matches a diagonally translated interior block and measures energy at corresponding pixels', () => {
    const grid = { width: 12, height: 12 };
    const previous = new Uint8Array(grid.width * grid.height);
    const next = new Uint8Array(previous.length);
    const pattern = [
      [255, 17, 69, 104],
      [128, 56, 203, 78],
      [47, 224, 31, 157],
      [198, 94, 131, 242],
    ];
    stamp(previous, grid.width, 4, 4, pattern);
    stamp(next, grid.width, 6, 3, pattern);

    const result = estimateMotion(grid, previous, next);

    for (let y = 4; y < 8; y++) {
      const start = y * grid.width + 4;
      expect(result.motionX.slice(start, start + 4)).toEqual(Int8Array.of(2, 2, 2, 2));
      expect(result.motionY.slice(start, start + 4)).toEqual(Int8Array.of(-1, -1, -1, -1));
    }
    expect(result.frameDifferenceEnergy[4 * grid.width + 4]).toBe(255);
    expect(result.frameDifferenceEnergy[5 * grid.width + 4]).toBe(64);
    expect(result.frameDifferenceEnergy[3 * grid.width + 6]).toBe(255);
    expect(result.frameDifferenceEnergy[0]).toBe(0);
  });

  it('matches the partial block at the bottom-right of a grid', () => {
    const grid = { width: 10, height: 10 };
    const previous = new Uint8Array(grid.width * grid.height);
    const next = new Uint8Array(previous.length);
    const pattern = [
      [29, 191],
      [244, 73],
    ];
    stamp(previous, grid.width, 8, 8, pattern);
    stamp(next, grid.width, 6, 7, pattern);

    const result = estimateMotion(grid, previous, next);

    for (const cell of [88, 89, 98, 99]) {
      expect([result.motionX[cell], result.motionY[cell]]).toEqual([-2, -1]);
    }
  });

  it('matches the full block at the positive vertical search limit despite a first-row decoy', () => {
    const grid = { width: 12, height: 12 };
    const previous = new Uint8Array(grid.width * grid.height);
    const next = new Uint8Array(previous.length);
    const pattern = [
      [255, 17, 69, 104],
      [128, 56, 203, 78],
      [47, 224, 31, 157],
      [198, 94, 131, 242],
    ];
    stamp(previous, grid.width, 4, 4, pattern);
    stamp(next, grid.width, 5, 6, pattern);
    stamp(next, grid.width, 2, 3, pattern.slice(0, 1));

    const result = estimateMotion(grid, previous, next);

    for (let y = 4; y < 8; y++) {
      const start = y * grid.width + 4;
      expect(result.motionX.slice(start, start + 4)).toEqual(Int8Array.of(1, 1, 1, 1));
      expect(result.motionY.slice(start, start + 4)).toEqual(Int8Array.of(2, 2, 2, 2));
    }
  });

  it('matches columns in source order despite a reversed-column decoy', () => {
    const grid = { width: 12, height: 12 };
    const previous = new Uint8Array(grid.width * grid.height);
    const next = new Uint8Array(previous.length);
    const pattern = [
      [255, 17, 69, 104],
      [128, 56, 203, 78],
      [47, 224, 31, 157],
      [198, 94, 131, 242],
    ];
    stamp(previous, grid.width, 4, 4, pattern);
    stamp(next, grid.width, 6, 4, pattern);
    stamp(
      next,
      grid.width,
      0,
      4,
      pattern.map((row) => [...row].reverse()),
    );

    const result = estimateMotion(grid, previous, next);

    for (let y = 4; y < 8; y++) {
      const start = y * grid.width + 4;
      expect(result.motionX.slice(start, start + 4)).toEqual(Int8Array.of(2, 2, 2, 2));
      expect(result.motionY.slice(start, start + 4)).toEqual(Int8Array.of(0, 0, 0, 0));
    }
  });

  it('does not search for an exact match three pixels from the original block', () => {
    const grid = { width: 12, height: 12 };
    const previous = new Uint8Array(grid.width * grid.height);
    const next = new Uint8Array(previous.length);
    const pattern = Array.from({ length: 4 }, () => [18, 127, 255, 93]);
    stamp(previous, grid.width, 4, 4, pattern);
    stamp(next, grid.width, 7, 4, pattern);

    const { motionX } = estimateMotion(grid, previous, next);

    expect(Math.abs(motionX[4 * grid.width + 4])).toBeLessThanOrEqual(2);
  });

  it('does not match a block across the right edge into the next row', () => {
    const grid = { width: 8, height: 8 };
    const previous = new Uint8Array(grid.width * grid.height);
    const next = new Uint8Array(previous.length);
    const pattern = [
      [12, 29, 87, 255],
      [63, 51, 178, 243],
      [33, 113, 27, 181],
      [207, 132, 11, 109],
    ];
    stamp(previous, grid.width, 4, 0, pattern);
    stamp(next, grid.width, 5, 0, pattern);

    const { motionX } = estimateMotion(grid, previous, next);

    for (let y = 0; y < 4; y++) {
      for (let x = 4; x < grid.width; x++) {
        expect(motionX[y * grid.width + x]).toBeLessThanOrEqual(0);
      }
    }
  });

  it('does not match a block across the left edge into the previous row', () => {
    const grid = { width: 8, height: 8 };
    const previous = new Uint8Array(grid.width * grid.height);
    const next = new Uint8Array(previous.length);
    const pattern = [
      [12, 29, 87, 255],
      [63, 51, 178, 243],
      [33, 113, 27, 181],
      [207, 132, 11, 109],
    ];
    stamp(previous, grid.width, 0, 4, pattern);
    stamp(next, grid.width, -1, 4, pattern);

    const { motionX } = estimateMotion(grid, previous, next);

    for (let y = 4; y < 8; y++) {
      for (let x = 0; x < 4; x++) {
        expect(motionX[y * grid.width + x]).toBeGreaterThanOrEqual(0);
      }
    }
  });
});
