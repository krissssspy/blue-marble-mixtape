import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { DEFAULT_AVATAR } from '../../src/engine/avatar.js';
import { drawText } from '../../src/engine/font.js';
import {
  clearFramebuffer,
  createFramebuffer,
  type Framebuffer,
} from '../../src/engine/framebuffer.js';
import { BACKDROP_RAMP, DUSK_PALETTE } from '../../src/engine/palette.js';
import { drawTutorial } from '../../src/engine/tutorial-render.js';

const thumbnailWidth = 48;
const thumbnailHeight = 27;
const groundY = 148;

function thumbnail(firstIndex: number): Uint8Array {
  return Uint8Array.from({ length: thumbnailWidth * thumbnailHeight }, (_, index) => {
    const x = index % thumbnailWidth;
    const y = Math.floor(index / thumbnailWidth);
    return firstIndex + ((x + 3 * y) % 4);
  });
}

function render(practiceThumbnail = thumbnail(5)): Framebuffer {
  const frame = createFramebuffer();
  drawTutorial(frame, 56, DEFAULT_AVATAR, practiceThumbnail);
  return frame;
}

function row(frame: Framebuffer, y: number, x = 0, width = frame.width): Uint8Array {
  const start = y * frame.width + x;
  return frame.pixels.slice(start, start + width);
}

function hasHint(frame: Framebuffer, label: string, approximateY: number): boolean {
  const reference = createFramebuffer();
  drawText(reference, label, 0, 0, 1);
  const width = [...label].length * 12 - 2;
  const mask = Array.from({ length: 16 }, (_, y) => [...row(reference, y, 0, width)]).flat();
  const lit = mask.indexOf(1);
  const blank = mask.indexOf(0);
  const pixel = (x: number, y: number, offset: number) =>
    frame.pixels[(y + Math.floor(offset / width)) * frame.width + x + (offset % width)];

  for (let y = approximateY - 4; y <= approximateY + 4; y += 1) {
    for (let x = 0; x <= 150 - width; x += 1) {
      const ink = pixel(x, y, lit);
      const backing = pixel(x, y, blank);
      if (
        ink !== backing &&
        mask.every((value, offset) => pixel(x, y, offset) === (value === 1 ? ink : backing))
      )
        return true;
    }
  }
  return false;
}

describe('tutorial rendering', () => {
  it('matches the indexed tutorial frame with a synthetic practice thumbnail', () => {
    const frame = createFramebuffer();
    clearFramebuffer(frame, 15);
    const avatar = { skin: 2, hair: 4, outfit: 3, headgear: 1 };
    drawTutorial(frame, 96, avatar, thumbnail(5));

    expect(createHash('sha256').update(frame.pixels).digest('hex')).toBe(
      'e1458ab8d38a9331a603024aca8414f4da2e21a27291591ec06dab073c48b219',
    );
  });

  it.each([
    { labels: ['←', '→', 'WALK'], y: 10 },
    { labels: ['↑', 'YES'], y: 32 },
    { labels: ['↓', 'NO'], y: 54 },
  ])('shows the 16px $labels hint', ({ labels, y }) => {
    const frame = render();

    for (const label of labels) expect(hasHint(frame, label, y), label).toBe(true);
  });

  it('shows a continuous walk line with visible seams between eight-pixel tile rows', () => {
    const frame = render();
    const walkLine = row(frame, groundY);
    expect(walkLine.every((index) => !BACKDROP_RAMP.includes(DUSK_PALETTE[index]))).toBe(true);

    const changes = (firstY: number, secondY: number): number => {
      const first = row(frame, firstY);
      const second = row(frame, secondY);
      return first.filter((value, x) => value !== second[x]).length;
    };

    for (const seam of [groundY + 7, groundY + 15, groundY + 23]) {
      expect(Math.max(changes(seam - 1, seam), changes(seam, seam + 1))).toBeGreaterThan(
        frame.width / 2,
      );
    }
  });

  it('uses all 48×27 thumbnail indices in row order and confines changes to the practice frame', () => {
    const first = thumbnail(5);
    const second = thumbnail(9);
    const before = render(first);
    const after = render(second);
    const changed = [...before.pixels.keys()].filter(
      (index) => before.pixels[index] !== after.pixels[index],
    );

    expect(changed).toHaveLength(thumbnailWidth * thumbnailHeight);
    const left = changed[0] % before.width;
    const top = Math.floor(changed[0] / before.width);
    const centerX = left + thumbnailWidth / 2;
    expect(centerX).toBeGreaterThanOrEqual(128);
    expect(centerX).toBeLessThanOrEqual(192);
    expect(top).toBeGreaterThanOrEqual(90);
    expect(top + thumbnailHeight).toBeLessThan(groundY);

    for (let y = 0; y < thumbnailHeight; y += 1) {
      const start = y * thumbnailWidth;
      expect(row(before, top + y, left, thumbnailWidth)).toEqual(
        first.slice(start, start + thumbnailWidth),
      );
      expect(row(after, top + y, left, thumbnailWidth)).toEqual(
        second.slice(start, start + thumbnailWidth),
      );
    }
  });
});
