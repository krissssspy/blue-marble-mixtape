import type { InputSample } from './input-buffer.js';

const walkingSpeed = 96;

export function walkPosition(
  x: number,
  { left, right }: Pick<InputSample, 'left' | 'right'>,
  { minX, maxX }: { readonly minX: number; readonly maxX: number },
  dt: number,
): number {
  const direction = Number(right) - Number(left);
  const nextX = x + direction * walkingSpeed * dt;
  return Math.max(minX, Math.min(nextX, maxX));
}
