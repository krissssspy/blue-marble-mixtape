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
      '45e326304955f42806676d9679813b096d4d806661189c077162208d48486632',
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
    const pixel = (x: number, y: number) => frame.pixels[y * frame.width + x];
    expect([pixel(60, 45), pixel(83, 45), pixel(106, 45)]).toEqual([10, 11, 4]);
    expect(frameHash(frame)).toBe(
      '3fc4a564801e6789d9daa61c3a396a8f02bb4953608e007ecd254439df0c6ad3',
    );
    expect(findBitmapText(frame, 'SCAN', area)).toBeDefined();
    expect(findBitmapText(frame, 'LINE SWEEP', area)).toBeDefined();
    expect(thumbnail).not.toHaveBeenCalled();

    drawLab(frame, { ...state, step: LAB_STEPS.length - 1 }, artifacts, thumbnail);
    expect(frameHash(frame)).toBe(
      '5487cb4ccb89a643fdf1aad06a6b46a11479949d4eaa7e29b04209ad4ab5f63b',
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
      '8a8818a6ec9ce97f3678075ca956b759c8830e2cd87a1365708c7fbd919a06e3',
    );
  });
});
