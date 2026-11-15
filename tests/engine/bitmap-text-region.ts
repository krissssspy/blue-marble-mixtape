import { drawText, measureTextWidth } from '../../src/engine/font.js';
import { createFramebuffer, type Framebuffer } from '../../src/engine/framebuffer.js';

export interface PixelRegion {
  readonly left: number;
  readonly top: number;
  readonly right: number;
  readonly bottom: number;
}

export function regionPixels(frame: Framebuffer, region: PixelRegion): number[] {
  const pixels: number[] = [];
  for (let y = region.top; y < region.bottom; y += 1) {
    const row = y * frame.width;
    pixels.push(...frame.pixels.slice(row + region.left, row + region.right));
  }
  return pixels;
}

export function findBitmapText(
  frame: Framebuffer,
  text: string,
  area: PixelRegion,
): PixelRegion | undefined {
  const width = measureTextWidth(text);
  const height = 16;
  const stencil = createFramebuffer();
  drawText(stencil, text, 0, 0, 1);
  const mask = regionPixels(stencil, { left: 0, top: 0, right: width, bottom: height });
  const inkIndex = mask.indexOf(1);
  const blankIndex = mask.indexOf(0);

  for (let y = area.top; y + height <= area.bottom; y += 1) {
    for (let x = area.left; x + width <= area.right; x += 1) {
      const sample = (offset: number) =>
        frame.pixels[(y + Math.floor(offset / width)) * frame.width + x + (offset % width)];
      const ink = sample(inkIndex);
      const backing = sample(blankIndex);
      if (ink < 5 || backing >= 5) continue;
      if (mask.every((mark, offset) => sample(offset) === (mark ? ink : backing))) {
        return { left: x, top: y, right: x + width, bottom: y + height };
      }
    }
  }
}
