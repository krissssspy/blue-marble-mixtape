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
import { writeFrameRgba } from '../../src/engine/display.js';
import { drawText } from '../../src/engine/font.js';
import {
  clearFramebuffer,
  createFramebuffer,
  type Framebuffer,
} from '../../src/engine/framebuffer.js';
import { BACKDROP_RAMP, DUSK_PALETTE, FRAME_PALETTE } from '../../src/engine/palette.js';
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

  it('fills the visible forehead, cheeks, neck, and hands with one distinct tone per choice', () => {
    const faceAndHands = [
      [4, 1],
      [5, 1],
      [3, 2],
      [8, 2],
      [2, 3],
      [9, 3],
      [4, 5],
      [7, 5],
      [1, 8],
      [10, 8],
    ];
    const tones = ['f2c79a', 'dea979', 'bf894f', 'a0673a', '7e573d', '5a3e2b'];
    function checkSkin(frame: Framebuffer, points: readonly (readonly number[])[], tone: string) {
      const rgba = new Uint8ClampedArray(frame.pixels.length * 4);
      writeFrameRgba(frame, rgba);
      for (const [x, y] of points) {
        const offset = (y * frame.width + x) * 4;
        expect(Buffer.from(rgba.subarray(offset, offset + 4)).toString('hex')).toBe(tone + 'ff');
      }
    }
    for (const [skin, tone] of tones.entries()) {
      const frame = sprite({ ...DEFAULT_AVATAR, skin });
      checkSkin(
        frame,
        faceAndHands.map(([x, y]) => [explorerX - 6 + x, feetY - 14 + y]),
        tone,
      );
      const picker = preview({ ...DEFAULT_AVATAR, skin }, 0);
      checkSkin(
        picker,
        [
          [51, 65],
          [57, 65],
          [51, 77],
          [57, 77],
        ],
        tone,
      );
    }
  });

  function legibleShades(shadowIndex: number, mainIndex: number, highlightIndex: number) {
    const [shadow, main, highlight] = [shadowIndex, mainIndex, highlightIndex].map(
      (index) => FRAME_PALETTE[index],
    );
    const darkest = BACKDROP_RAMP[0];
    expect(contrastRatio(shadow, darkest)).toBeLessThan(contrastRatio(main, darkest));
    expect(contrastRatio(main, darkest)).toBeLessThan(contrastRatio(highlight, darkest));
    for (const shade of [shadow, main, highlight]) {
      for (const backdrop of BACKDROP_RAMP) {
        expect(contrastRatio(shade, backdrop)).toBeGreaterThanOrEqual(3);
      }
    }
  }

  it('renders six distinct shirts with legible highlights and shadows', () => {
    const shirts = new Set<number>();
    for (const [outfit] of AVATAR_LABELS.outfit.entries()) {
      const frame = preview({ ...DEFAULT_AVATAR, outfit }, 2);
      const shirt = frame.pixels[102 * frame.width + 60];
      legibleShades(
        frame.pixels[112 * frame.width + 42],
        shirt,
        frame.pixels[94 * frame.width + 42],
      );
      shirts.add(shirt);
    }
    expect(shirts.size).toBe(6);
  });

  it('draws a legible highlight and shadow on both trouser legs', () => {
    const frame = preview(DEFAULT_AVATAR, 2);
    for (const left of [39, 69]) {
      const row = 125 * frame.width + left;
      legibleShades(frame.pixels[row + 12], frame.pixels[row + 6], frame.pixels[row]);
    }
  });

  it.each(
    [
      '7cda70f2877e0a1cfc64be636dc0bc60ffbac99e56056384a5263c39efb680ed',
      '4bceb2b74d806fa8f186c65e5c8c112bb86a18c7a36ad85696217f110ac5e45d',
      'be52c10583d8a74365d55a9f497ca8eb40bad2507ec12713bdb78b0a3b445af1',
      'd6537e6754f9e1dd80fff853b4d962a67c2037e063617b5c13e91757d0bd0b34',
      '0c52289b5ce59a54b94db37ae4d13e255c08cac973edafee6b7ee1a6df12c1b1',
      '1cbc9ef5548f02fa834180e2b9ec4b137384f523f506d8fc58fa7ff5c9455b33',
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
