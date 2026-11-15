const width = 320;
const height = 180;
const tileSize = 8;
export const transparentIndex = 255;

export interface Framebuffer {
  readonly width: number;
  readonly height: number;
  readonly pixels: Uint8Array;
}

export function createFramebuffer(): Framebuffer {
  return { width, height, pixels: new Uint8Array(width * height) };
}

export function clearFramebuffer(frame: Framebuffer, index: number): void {
  frame.pixels.fill(index);
}

export function fillRect(
  frame: Framebuffer,
  x: number,
  y: number,
  width: number,
  height: number,
  index: number,
): void {
  const left = Math.max(0, x);
  const top = Math.max(0, y);
  const right = Math.min(frame.width, x + width);
  const bottom = Math.min(frame.height, y + height);
  if (left >= right) return;

  for (let row = top; row < bottom; row += 1) {
    const start = row * frame.width;
    frame.pixels.fill(index, start + left, start + right);
  }
}

export function blitTile(frame: Framebuffer, x: number, y: number, tile: Uint8Array): void {
  const left = Math.max(0, x);
  const top = Math.max(0, y);
  const right = Math.min(frame.width, x + tileSize);
  const bottom = Math.min(frame.height, y + tileSize);

  for (let row = top; row < bottom; row += 1) {
    const sourceRow = (row - y) * tileSize;
    const destinationRow = row * frame.width;
    for (let column = left; column < right; column += 1) {
      const index = tile[sourceRow + column - x];
      if (index !== transparentIndex) frame.pixels[destinationRow + column] = index;
    }
  }
}
