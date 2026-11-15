import { describe, expect, it } from 'vitest';
import { extractSobel } from '../../tools/ingest/lib/sobel.mjs';

function fromRows(rows: number[][]) {
  return extractSobel({
    width: rows[0].length,
    height: rows.length,
    luminance: Uint8Array.from(rows.flat()),
  });
}

describe('extractSobel', () => {
  it('emits zero magnitude and direction throughout a flat grid', () => {
    const rows = Array.from({ length: 3 }, () => [150, 150, 150, 150]);
    const { edgeMagnitude, edgeDirection } = fromRows(rows);

    expect(edgeMagnitude).toEqual(new Uint8Array(12));
    expect(edgeDirection).toEqual(new Uint8Array(12));
  });

  it.each([
    { name: 'right', bright: (x: number) => x >= 2, expected: 0 },
    { name: 'down', bright: (_x: number, y: number) => y >= 2, expected: 64 },
    { name: 'left', bright: (x: number) => x <= 0, expected: 128 },
    { name: 'up', bright: (_x: number, y: number) => y <= 0, expected: 191 },
  ])('encodes a full step toward the $name', ({ bright, expected }) => {
    const rows = Array.from({ length: 3 }, (_, y) =>
      Array.from({ length: 3 }, (_, x) => (bright(x, y) ? 255 : 0)),
    );
    const { edgeMagnitude, edgeDirection } = fromRows(rows);

    expect(edgeMagnitude[4]).toBe(180);
    expect(edgeDirection[4]).toBe(expected);
  });

  it('combines both Sobel derivatives at a diagonal edge', () => {
    const { edgeMagnitude, edgeDirection } = fromRows([
      [0, 0, 0],
      [0, 0, 255],
      [0, 255, 255],
    ]);

    expect(edgeMagnitude[4]).toBe(191);
    expect(edgeDirection[4]).toBe(32);
  });

  it('replicates border pixels to keep the boundary gradient in row-major order', () => {
    const { edgeMagnitude, edgeDirection } = fromRows([
      [255, 0, 0],
      [255, 0, 0],
    ]);

    expect(edgeMagnitude).toEqual(Uint8Array.of(180, 180, 0, 180, 180, 0));
    expect(edgeDirection).toEqual(Uint8Array.of(128, 128, 0, 128, 128, 0));
  });

  it('samples an asymmetric ramp at an interior cell and the clamped right edge', () => {
    const { edgeMagnitude, edgeDirection } = fromRows([
      [0, 10, 20, 30],
      [40, 60, 80, 100],
      [120, 150, 180, 210],
      [220, 230, 240, 250],
    ]);

    const interior = 2 * 4 + 2;
    const rightEdge = 2 * 4 + 3;
    expect([edgeMagnitude[interior], edgeDirection[interior]]).toEqual([118, 53]);
    expect([edgeMagnitude[rightEdge], edgeDirection[rightEdge]]).toEqual([109, 58]);
  });
});
