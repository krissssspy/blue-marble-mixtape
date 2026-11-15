import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { AVATAR_STEPS, DEFAULT_AVATAR, type AvatarSelection } from '../../src/engine/avatar.js';
import { drawAvatarScreen, drawExplorer } from '../../src/engine/avatar-render.js';
import { contrastRatio } from '../../src/engine/background.js';
import { drawText } from '../../src/engine/font.js';
import {
  clearFramebuffer,
  createFramebuffer,
  type Framebuffer,
} from '../../src/engine/framebuffer.js';
import { DUSK_PALETTE } from '../../src/engine/palette.js';
import { AVATAR_LABELS } from '../../src/strings.js';

const backing = 15;
const explorerX = 80;
const feetY = 120;

function sprite(appearance: AvatarSelection, scale = 1): Framebuffer {
  const frame = createFramebuffer();
  clearFramebuffer(frame, backing);
  drawExplorer(frame, explorerX, feetY, appearance, scale);
  return frame;
}

function preview(appearance: AvatarSelection, step: number): Framebuffer {
  const frame = createFramebuffer();
  drawAvatarScreen(frame, appearance, step);
  return frame;
}

function spriteBounds(frame: Framebuffer) {
  const points = [...frame.pixels.entries()]
    .filter(([, value]) => value !== backing)
    .map(([index]) => ({ x: index % frame.width, y: Math.floor(index / frame.width) }));
  const x = points.map((point) => point.x);
  const y = points.map((point) => point.y);
  return {
    left: Math.min(...x),
    right: Math.max(...x),
    top: Math.min(...y),
    bottom: Math.max(...y),
  };
}

function hasReadableChoice(frame: Framebuffer, choice: string): boolean {
  const mask = createFramebuffer();
  drawText(mask, choice, 0, 0, 1);
  const glyphWidth = [...choice].length * 12 - 2;
  const points = Array.from({ length: 16 }, (_, y) =>
    Array.from({ length: glyphWidth }, (_, x) => ({
      x,
      y,
      ink: mask.pixels[y * mask.width + x] === 1,
    })),
  ).flat();
  const firstInk = points.find(({ ink }) => ink)!;
  const firstBlank = points.find(({ ink }) => !ink)!;

  for (let y = 1; y < frame.height - 17; y += 1) {
    for (let x = 118; x < frame.width - glyphWidth - 1; x += 1) {
      const foreground = frame.pixels[(y + firstInk.y) * frame.width + x + firstInk.x];
      const background = frame.pixels[(y + firstBlank.y) * frame.width + x + firstBlank.x];
      if (
        foreground === background ||
        contrastRatio(DUSK_PALETTE[foreground], DUSK_PALETTE[background]) < 4.5
      )
        continue;
      if (
        points.every(
          (point) =>
            frame.pixels[(y + point.y) * frame.width + x + point.x] ===
            (point.ink ? foreground : background),
        )
      )
        return true;
    }
  }
  return false;
}

describe('avatar and explorer rendering', () => {
  it.each(
    [
      'c5f4782d2beb954f2f15a2c89d3fe82fcf631d42b0a10e8ba4e0fbcb7c43b335',
      '6321d6c337d0c8c11b9b3f2ec3b852883c90b333b23d59038763ada04c1e214a',
      'e1401ad915e87d5515e173c7d210fd9a5a5b369999f5596e0a340c3d5c4eb0ce',
      '748237dcf3d098122c982631f33b91b63586c16715068f1afd3da4ac68d21295',
      'b0544d303a37880edeeedd258fff35b7b1b75125a8a0a286998a4fec911fae7f',
      '30f6a8b78724db610faa60ffe61ed6a00dccd59430dff334531a0d7c43e21316',
    ].map((expected, choice) => ({ choice, expected })),
  )(
    'matches indexed frames for choice $choice across four avatar steps',
    ({ choice, expected }) => {
      const appearance = { skin: choice, hair: choice, outfit: choice, headgear: choice };
      const digest = createHash('sha256');
      for (const [step] of AVATAR_STEPS.entries()) {
        digest.update(preview(appearance, step).pixels);
      }

      expect(digest.digest('hex')).toBe(expected);
    },
  );

  it('grounds the explorer at the nominated feet row at native and preview scale', () => {
    const frame = sprite(DEFAULT_AVATAR);
    const native = spriteBounds(frame);
    const scaled = spriteBounds(sprite(DEFAULT_AVATAR, 3));

    expect(native.left).toBeGreaterThanOrEqual(explorerX - 24);
    expect(native.right).toBeLessThanOrEqual(explorerX + 24);
    expect(native.top).toBeLessThan(feetY - 3);
    expect(native.bottom).toBe(feetY - 1);
    expect(scaled.bottom).toBe(feetY - 1);
    expect(scaled.right - scaled.left + 1).toBe((native.right - native.left + 1) * 3);
    expect(scaled.bottom - scaled.top + 1).toBe((native.bottom - native.top + 1) * 3);
    expect(frame.pixels[0]).toBe(backing);
    expect(frame.pixels[feetY * frame.width + explorerX]).toBe(backing);
  });

  it.each(AVATAR_STEPS.map(({ key }, step) => ({ key, step })))(
    'shows six distinct $key choices on the walkway and in the large preview',
    ({ key, step }) => {
      const sprites = new Set<string>();
      const previews = new Set<string>();
      for (let choice = 0; choice < 6; choice += 1) {
        const appearance = { ...DEFAULT_AVATAR, [key]: choice };
        const walker = sprite(appearance);
        const picker = preview(appearance, step);

        sprites.add(walker.pixels.join(','));
        const leftRows = Array.from({ length: picker.height }, (_, y) =>
          picker.pixels.slice(y * picker.width, y * picker.width + 116).join(','),
        );
        previews.add(leftRows.join(','));
      }

      expect(sprites.size).toBe(6);
      expect(previews.size).toBe(6);
    },
  );

  it('names the selected choice on a solid high-contrast panel', () => {
    const appearance = { ...DEFAULT_AVATAR, outfit: 2 };
    const frame = preview(appearance, 2);
    const selected = AVATAR_LABELS.outfit[appearance.outfit].toUpperCase();

    expect(hasReadableChoice(frame, selected)).toBe(true);
  });
});
