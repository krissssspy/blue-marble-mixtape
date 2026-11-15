import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { STRINGS } from '../../src/strings.js';
import { contrastRatio } from '../../src/engine/background.js';
import {
  clearFramebuffer,
  createFramebuffer,
  type Framebuffer,
} from '../../src/engine/framebuffer.js';
import { DUSK_PALETTE } from '../../src/engine/palette.js';
import { drawWelcome } from '../../src/engine/welcome.js';
import { findBitmapText, regionPixels } from './bitmap-text-region.js';

const titleArea = { left: 16, top: 38, right: 162, bottom: 96 };
const startArea = { left: 18, top: 105, right: 154, bottom: 155 };

function pixel(frame: Framebuffer, x: number, y: number): number {
  return frame.pixels[y * frame.width + x];
}

function welcomeFrame(): Framebuffer {
  const frame = createFramebuffer();
  clearFramebuffer(frame, 15);
  drawWelcome(frame);
  return frame;
}

describe('Welcome frame', () => {
  it('matches the reviewed 320×180 indexed title frame', () => {
    const frame = welcomeFrame();

    expect([frame.width, frame.height]).toEqual([320, 180]);
    expect(createHash('sha256').update(frame.pixels).digest('hex')).toBe(
      'eafb8b8da5db6303968903ed2b9762d5cdf97df6635f4e096d74d8594bc87726',
    );
  });

  it('keeps the one-word title readable in the left column', () => {
    const frame = welcomeFrame();
    const title = findBitmapText(frame, STRINGS.welcomeTitle, titleArea);

    expect(title).toBeDefined();
    const colors = [...new Set(regionPixels(frame, title!))];
    expect(colors).toHaveLength(2);
    expect(contrastRatio(DUSK_PALETTE[colors[0]], DUSK_PALETTE[colors[1]])).toBeGreaterThan(4.5);
  });

  it('makes the Earth the dominant illustration with visible terrain, day and night', () => {
    const frame = welcomeFrame();
    const scene = { left: 174, top: 24, right: 305, bottom: 147 };
    const illustration = regionPixels(frame, scene);
    const terrain = illustration.filter((color) => color === 8 || color === 9);

    expect(terrain.length).toBeGreaterThan(1500);
    expect(new Set(terrain)).toEqual(new Set([8, 9]));
    const rim = { left: 185, top: 32, right: 236, bottom: 72 };
    expect(regionPixels(frame, rim).filter((color) => color === 11).length).toBeGreaterThan(32);
    expect(pixel(frame, 284, 112)).toBe(3);
    expect(pixel(frame, 241, 140)).not.toBe(pixel(frame, 241, 150));
  });

  it('shows a high-contrast Up Start control below the title', () => {
    const frame = welcomeFrame();
    const start = findBitmapText(frame, STRINGS.start, startArea);

    expect(start).toBeDefined();
    const colors = [...new Set(regionPixels(frame, start!))];
    expect(colors).toHaveLength(2);
    expect(contrastRatio(DUSK_PALETTE[colors[0]], DUSK_PALETTE[colors[1]])).toBeGreaterThan(7);
    expect(pixel(frame, 30, 111)).toBe(11);
    expect(pixel(frame, 30, 145)).toBe(0);
  });
});
