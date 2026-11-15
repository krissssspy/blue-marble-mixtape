import { fillRect, type Framebuffer } from './framebuffer.js';

interface ArtifactFocus {
  readonly tick: number;
  readonly pulse: boolean;
  readonly sparkles: boolean;
}

const thumbnailWidth = 48;
const thumbnailHeight = 27;
const dusk = {
  backing: 1,
  gold: 6,
  coral: 7,
  rim: 12,
  postShadow: 13,
} as const;

export function drawArtifactFrame(
  frame: Framebuffer,
  centerX: number,
  floorY: number,
  thumbnail: Uint8Array,
  focus: ArtifactFocus | null,
): void {
  const center = Math.round(centerX);
  const floor = Math.round(floorY);
  const left = center - thumbnailWidth / 2;
  const top = floor - 44;
  const postTop = top + thumbnailHeight;
  fillRect(frame, center - 3, postTop, 6, floor - postTop, dusk.rim);
  fillRect(frame, center - 1, postTop, 2, floor - postTop, dusk.postShadow);

  if (focus) {
    fillRect(
      frame,
      left - 6,
      top - 6,
      thumbnailWidth + 12,
      thumbnailHeight + 12,
      focus.pulse ? dusk.gold : dusk.coral,
    );

    const phase = Math.floor(focus.tick / 6) % 8;
    const bob = Math.min(phase, 8 - phase);
    for (let dy = -3; dy <= 3; dy += 1) {
      const span = 3 - Math.abs(dy);
      fillRect(frame, center - span, top - 13 - bob + dy, 2 * span + 1, 1, dusk.gold);
    }

    if (focus.sparkles) {
      const shift = Math.floor(focus.tick / 8) % 2;
      for (const [x, y] of [
        [left - 11 + shift, top - 3],
        [left + thumbnailWidth + 10, top + 4 + shift * 3],
      ]) {
        fillRect(frame, x - 1, y, 3, 1, dusk.gold);
        fillRect(frame, x, y - 1, 1, 3, dusk.gold);
      }
    }
  }

  fillRect(frame, left - 4, top - 4, thumbnailWidth + 8, thumbnailHeight + 8, dusk.rim);
  fillRect(frame, left - 2, top - 2, thumbnailWidth + 4, thumbnailHeight + 4, dusk.backing);

  const visibleLeft = Math.max(0, left);
  const visibleRight = Math.min(frame.width, left + thumbnailWidth);
  if (visibleLeft >= visibleRight) return;
  for (let y = Math.max(0, top); y < Math.min(frame.height, top + thumbnailHeight); y += 1) {
    const source = (y - top) * thumbnailWidth + visibleLeft - left;
    const destination = y * frame.width + visibleLeft;
    frame.pixels.set(thumbnail.subarray(source, source + visibleRight - visibleLeft), destination);
  }
}
