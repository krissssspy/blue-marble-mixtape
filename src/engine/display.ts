import type { Framebuffer } from './framebuffer.js';
import { DUSK_PALETTE } from './palette.js';

const rgbaPalette = DUSK_PALETTE.map((hex) => {
  const rgb = Number.parseInt(hex.slice(1), 16);
  return [(rgb >> 16) & 255, (rgb >> 8) & 255, rgb & 255, 255];
});

export function writeFrameRgba(frame: Framebuffer, target: Uint8ClampedArray): void {
  for (let pixel = 0; pixel < frame.pixels.length; pixel += 1) {
    target.set(rgbaPalette[frame.pixels[pixel]], pixel * 4);
  }
}
