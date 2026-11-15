import { TUTORIAL_HINTS } from '../strings.js';
import { drawExplorer, type ExplorerPose } from './avatar-render.js';
import type { AvatarSelection } from './avatar.js';
import { shadeBackdrop } from './background.js';
import { drawText } from './font.js';
import { clearFramebuffer, fillRect, type Framebuffer } from './framebuffer.js';

const groundY = 148;
const thumbnailX = 136;
const thumbnailY = 104;
const thumbnailWidth = 48;
const thumbnailHeight = 27;

function drawLandscape(frame: Framebuffer): void {
  clearFramebuffer(frame, 0);
  fillRect(frame, 0, 76, frame.width, groundY - 76, 1);

  for (let x = 0; x < frame.width; x += 1) {
    const farY = Math.round(115 + Math.sin(x * 0.03) * 7 + Math.sin(x * 0.012 + 2) * 6);
    const nearY = Math.round(136 + Math.sin(x * 0.05 + 1) * 4);
    fillRect(frame, x, farY, 1, groundY - farY, 2);
    fillRect(frame, x, nearY, 1, groundY - nearY, 3);
  }

  for (const [x, base] of [
    [28, 122],
    [92, 126],
    [218, 122],
    [272, 132],
  ]) {
    for (let row = 0; row < 12; row += 1) {
      const span = Math.floor(row / 2);
      fillRect(frame, x - span, base - 12 + row, 2 * span + 1, 1, 3);
    }
  }
}

function drawWalkway(frame: Framebuffer): void {
  for (let y = groundY; y < frame.height; y += 8) {
    for (let x = 0; x < frame.width; x += 8) {
      fillRect(frame, x, y, 8, 8, 13);
      fillRect(frame, x + 1, y + 3, 3, 1, 14);
      fillRect(frame, x + 7, y + 1, 1, 7, 2);
      fillRect(frame, x, y + 7, 8, 1, 2);
    }
  }
  fillRect(frame, 0, groundY, frame.width, 2, 12);
}

function drawHints(frame: Framebuffer): void {
  fillRect(frame, 8, 6, 106, 67, 4);
  fillRect(frame, 9, 7, 104, 65, 1);
  for (const [row, { arrows, label }] of TUTORIAL_HINTS.entries()) {
    const y = 10 + 22 * row;
    for (const [column, arrow] of arrows.entries()) {
      const x = 11 + 20 * column;
      fillRect(frame, x, y - 1, 17, 18, 12);
      fillRect(frame, x + 1, y, 15, 16, 0);
      drawText(frame, arrow, x + 3, y, 5);
    }
    drawText(frame, label, 16 + 20 * arrows.length, y, 5);
  }
}

function drawPracticeArtifact(frame: Framebuffer, thumbnail: Uint8Array): void {
  fillRect(frame, 157, 131, 6, groundY - 131, 12);
  fillRect(frame, 159, 131, 2, groundY - 131, 13);
  fillRect(frame, 132, 100, thumbnailWidth + 8, thumbnailHeight + 8, 12);
  fillRect(frame, 134, 102, thumbnailWidth + 4, thumbnailHeight + 4, 1);
  for (let y = 0; y < thumbnailHeight; y += 1) {
    const source = y * thumbnailWidth;
    const destination = (thumbnailY + y) * frame.width + thumbnailX;
    frame.pixels.set(thumbnail.subarray(source, source + thumbnailWidth), destination);
  }
}

export function drawTutorial(
  frame: Framebuffer,
  explorerX: number,
  avatar: AvatarSelection,
  practiceThumbnail: Uint8Array,
  pose: ExplorerPose = 0,
): void {
  drawLandscape(frame);
  shadeBackdrop(frame);
  drawWalkway(frame);
  drawHints(frame);
  drawPracticeArtifact(frame, practiceThumbnail);
  drawExplorer(frame, explorerX, groundY, avatar, 1, pose);
}
