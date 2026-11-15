const width = 320;
const height = 180;

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
