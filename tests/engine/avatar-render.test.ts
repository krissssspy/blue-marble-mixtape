import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { AVATAR_STEPS, DEFAULT_AVATAR, type AvatarSelection } from '../../src/engine/avatar.js';
import {
  drawAvatarScreen,
  drawExplorer,
  walkPose,
  type ExplorerPose,
} from '../../src/engine/avatar-render.js';
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

function sprite(appearance: AvatarSelection, scale = 1, pose: ExplorerPose = 0): Framebuffer {
  const frame = createFramebuffer();
  clearFramebuffer(frame, backing);
  drawExplorer(frame, explorerX, feetY, appearance, scale, pose);
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
  it('alternates grounded stride poses while moving and uses the standing pose for reduced motion', () => {
    expect([0, 1, 6, 7, 12, 13, 19, 24, 25].map((step) => walkPose(step, false))).toEqual([
      0, 1, 1, 2, 2, 3, 2, 2, 1,
    ]);
    expect(walkPose(19, true)).toBe(0);

    const standing = sprite(DEFAULT_AVATAR);
    const legs = (feetY - 4) * standing.width;
    const silhouettes = new Set([standing.pixels.slice(legs).join(',')]);
    for (const pose of [1, 2, 3] as const) {
      const frame = sprite(DEFAULT_AVATAR, 1, pose);
      expect(spriteBounds(frame).bottom).toBe(feetY - 1);
      expect(frame.pixels.slice(0, legs)).toEqual(standing.pixels.slice(0, legs));
      silhouettes.add(frame.pixels.slice(legs).join(','));
    }
    expect(silhouettes.size).toBe(4);
  });

  it('fills the visible face, neck, and hands with the selected skin tone', () => {
    const faceAndHands = [
      [3, 2],
      [8, 2],
      [2, 3],
      [9, 3],
      [4, 5],
      [7, 5],
      [1, 8],
      [10, 8],
    ];
    for (const [skin, tone] of [15, 15, 14, 14, 13, 13].entries()) {
      const frame = sprite({ ...DEFAULT_AVATAR, skin });
      for (const [x, y] of faceAndHands) {
        expect(frame.pixels[(feetY - 14 + y) * frame.width + explorerX - 6 + x]).toBe(tone);
      }
      const picker = preview({ ...DEFAULT_AVATAR, skin }, 0);
      const cheek = picker.pixels[77 * picker.width + 51];
      expect([5, 13, 14, 15]).toContain(cheek);
    }
  });

  it('keeps each shirt distinct from the avatar preview backdrop', () => {
    const shirts = new Set<number>();
    for (const [outfit] of AVATAR_LABELS.outfit.entries()) {
      const frame = preview({ ...DEFAULT_AVATAR, outfit }, 2);
      const shirt = frame.pixels[102 * frame.width + 60];
      expect(contrastRatio(DUSK_PALETTE[shirt], DUSK_PALETTE[3])).toBeGreaterThanOrEqual(3);
      shirts.add(shirt);
    }
    expect(shirts.size).toBe(6);
  });

  it.each(
    [
      '4720a8545ae2aeb76d764f07dc18f29cc20368525507b34549ee9420ba29fc5c',
      '2e58cc3b4b184dcf19288269072c0afbc1a80c5c556c666d7f6943867f7a770b',
      'aaafef662fee9f4e09b4cbaeb00ced3497c6a0249c1299bfdb6026f8e0572017',
      'ce604fc61446797ba8f4f1c6af746f2fe2539b3d7106cfa28c9d6e3aa584f14c',
      'c6375f33dffd47f2f5cc10a4f2b8fe65f0140518a2ed92e7bbddd230f89521fd',
      'c4fa9a41ee3b5291b9ba59a3fb5fd334c6da68869a82ad4b873a01e4abf878e4',
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
