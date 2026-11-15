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
