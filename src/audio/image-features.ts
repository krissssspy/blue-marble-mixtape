import type { FeaturePack } from './feature-pack.js';
import type { ImagePoint } from './score.js';

export function unit(value: number): number {
  return Math.max(0, Math.min(1, value));
}

export function point(x: number, y: number): ImagePoint {
  return { x: unit(x), y: unit(y) };
}

export function cell(pack: FeaturePack, { x, y }: ImagePoint, frameIndex = 0) {
  const frame = pack.frames[frameIndex % pack.frames.length];
  const column = Math.round(x * (pack.width - 1));
  const row = Math.round(y * (pack.height - 1));
  const index = row * pack.width + column;
  return {
    light: frame.luminance[index] / 255,
    hue: frame.hue[index] / 255,
    saturation: frame.saturation[index] / 255,
    edge: frame.edgeMagnitude[index] / 255,
    direction: (frame.edgeDirection[index] / 255) * 2 * Math.PI,
    motionX: (frame.motionX?.[index] ?? 0) / 128,
    motionY: (frame.motionY?.[index] ?? 0) / 128,
    change: (frame.frameDifferenceEnergy?.[index] ?? 0) / 255,
  };
}

export function hilbertCell(index: number): ImagePoint {
  let x = 0;
  let y = 0;
  for (let side = 1; side < 8; side *= 2) {
    const right = (index >>> 1) & 1;
    const upper = (index ^ right) & 1;
    if (!upper) {
      if (right) {
        x = side - 1 - x;
        y = side - 1 - y;
      }
      [x, y] = [y, x];
    }
    x += side * right;
    y += side * upper;
    index >>>= 2;
  }
  return point((x + 0.5) / 8, (y + 0.5) / 8);
}
