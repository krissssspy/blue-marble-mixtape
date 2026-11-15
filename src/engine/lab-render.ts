import { AVATAR_COPY, LAB_COPY } from '../strings.js';
import { drawText, measureTextWidth } from './font.js';
import { clearFramebuffer, fillRect, type Framebuffer } from './framebuffer.js';
import { LAB_STEPS, type LabState } from './lab.js';
import type { CatalogArtifact } from './museum-assets.js';

export function labChoice(state: LabState, artifacts: readonly CatalogArtifact[]) {
  const field = LAB_STEPS[state.step];
  const raw =
    field === 'artifact' || field === 'play'
      ? artifacts[state.artifactIndex].shortTitle
      : state.recipe[field].replace(/([a-z])([A-Z])/g, '$1 $2');
  return { title: LAB_COPY.steps[field], value: raw.toUpperCase() };
}

function centerText(frame: Framebuffer, text: string, y: number): void {
  const x = Math.floor((frame.width - measureTextWidth(text)) / 2);
  drawText(frame, text, x, y, 5);
}

function drawStrip(
  frame: Framebuffer,
  state: LabState,
  artifacts: readonly CatalogArtifact[],
  thumbnail: (artifact: CatalogArtifact) => Uint8Array,
): void {
  for (const [slot, center] of [62, 160, 258].entries()) {
    const index = (state.artifactIndex + slot - 1 + artifacts.length) % artifacts.length;
    const pixels = thumbnail(artifacts[index]);
    const scale = slot === 1 ? 2 : 1;
    const left = center - 24 * scale;
    const top = 90 - Math.floor((27 * scale) / 2);
    fillRect(frame, left - 2, top - 2, 48 * scale + 4, 27 * scale + 4, slot === 1 ? 6 : 12);
    for (let y = 0; y < 27; y += 1) {
      for (let x = 0; x < 48; x += 1) {
        fillRect(frame, left + x * scale, top + y * scale, scale, scale, pixels[y * 48 + x]);
      }
    }
  }
}

export function drawLab(
  frame: Framebuffer,
  state: LabState,
  artifacts: readonly CatalogArtifact[],
  thumbnail: (artifact: CatalogArtifact) => Uint8Array,
): void {
  const field = LAB_STEPS[state.step];
  const { title, value } = labChoice(state, artifacts);
  clearFramebuffer(frame, 0);
  fillRect(frame, 24, 12, 272, 156, 12);
  fillRect(frame, 27, 15, 266, 150, 1);
  centerText(frame, title, 23);
  for (let step = 0; step < LAB_STEPS.length; step += 1) {
    fillRect(frame, 59 + 23 * step, 45, 18, 4, step === state.step ? 6 : 4);
  }
  if (field === 'artifact') {
    drawStrip(frame, state, artifacts, thumbnail);
    centerText(frame, value, 123);
  } else {
    centerText(frame, value, 82);
    if (field !== 'play') {
      drawText(frame, AVATAR_COPY.previous, 32, 82, 5);
      drawText(frame, AVATAR_COPY.next, 276, 82, 5);
    }
  }
  drawText(frame, field === 'play' ? LAB_COPY.play : LAB_COPY.next, 52, 146, 5);
  drawText(frame, AVATAR_COPY.back, 198, 146, 5);
}

export function drawLabInvite(frame: Framebuffer): void {
  fillRect(frame, 6, 39, measureTextWidth(LAB_COPY.invite) + 12, 23, 1);
  drawText(frame, LAB_COPY.invite, 12, 42, 5);
}
