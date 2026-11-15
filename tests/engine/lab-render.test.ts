import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';
import { createFramebuffer } from '../../src/engine/framebuffer.js';
import { drawLab, drawLabInvite, labChoice } from '../../src/engine/lab-render.js';
import { createLabState, LAB_STEPS } from '../../src/engine/lab.js';
import type { CatalogArtifact, MuseumCatalog } from '../../src/engine/museum-assets.js';
import { findBitmapText } from './bitmap-text-region.js';

const { artifacts } = JSON.parse(
  readFileSync(new URL('../../public/catalog.json', import.meta.url), 'utf8'),
) as MuseumCatalog;

const frameHash = (frame: ReturnType<typeof createFramebuffer>) =>
  createHash('sha256').update(frame.pixels).digest('hex');

describe('Lab thumbnail strip and recipe display', () => {
  it('draws the selected item and the previous and next catalog thumbnails', () => {
    const thumbnail = vi.fn((artifact: CatalogArtifact) =>
      new Uint8Array(48 * 27).fill(artifact.id === artifacts[0].id ? 9 : 4),
    );
    const state = createLabState();
    const frame = createFramebuffer();
    drawLab(frame, state, artifacts, thumbnail);
    expect(frameHash(frame)).toBe(
      '852cbff4f72d90ca16ba8fa5a72139b2b1d04013492520ebcd961f6f719a84b2',
    );
    expect(thumbnail.mock.calls.map(([artifact]) => artifact.id)).toEqual([
      artifacts.at(-1)!.id,
      artifacts[0].id,
      artifacts[1].id,
    ]);
    expect(frame.pixels[90 * frame.width + 160]).toBe(9);
    expect(frame.pixels[90 * frame.width + 62]).toBe(4);
    expect(frame.pixels[90 * frame.width + 258]).toBe(4);
    expect(labChoice(state, artifacts)).toEqual({
      title: 'ARTIFACT',
      value: artifacts[0].shortTitle.toUpperCase(),
    });
  });

  it('shows the selected recipe setting and the final play choice in readable pixels', () => {
    const frame = createFramebuffer();
    const state = { ...createLabState(), step: 1 };
    const thumbnail = vi.fn(() => new Uint8Array(48 * 27));
    const area = { left: 32, top: 16, right: 288, bottom: 154 };
    drawLab(frame, state, artifacts, thumbnail);
    expect(frameHash(frame)).toBe(
      '9780b11e58e7b31dd9975c17c47f698a1506f904dbf4a3fddb954aeb60e6d8fe',
    );
    expect(findBitmapText(frame, 'SCAN', area)).toBeDefined();
    expect(findBitmapText(frame, 'LINE SWEEP', area)).toBeDefined();
    expect(thumbnail).not.toHaveBeenCalled();

    drawLab(frame, { ...state, step: LAB_STEPS.length - 1 }, artifacts, thumbnail);
    expect(frameHash(frame)).toBe(
      '2c5e56f01986d9957fcbc3c006625b8fd0b591c60675498b362dc2a7746205b3',
    );
    expect(findBitmapText(frame, 'PLAY?', area)).toBeDefined();
    expect(
      findBitmapText(frame, '↑ PLAY', { left: 40, top: 140, right: 275, bottom: 176 }),
    ).toBeDefined();
  });

  it('shows the entrance cue in a solid panel', () => {
    const frame = createFramebuffer();
    drawLabInvite(frame);
    expect(frameHash(frame)).toBe(
      '57c524f4d6d6745051771c52750dd95898d412013963f1fc5606b1d6845823ec',
    );
  });
});
