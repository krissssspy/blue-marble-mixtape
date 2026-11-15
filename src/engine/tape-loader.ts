import { STRINGS } from '../strings.js';
import { drawText, measureTextWidth } from './font.js';
import { fillRect, type Framebuffer } from './framebuffer.js';

function drawReel(frame: Framebuffer, centerX: number, fraction: number): void {
  const centerY = 51;
  const radius = Math.round(13 * Math.sqrt(fraction));
  for (let y = -radius; y <= radius; y += 1) {
    const span = Math.floor(Math.sqrt(radius * radius - y * y));
    fillRect(frame, centerX - span, centerY + y, span * 2 + 1, 1, 12);
  }
  fillRect(frame, centerX - 3, centerY - 3, 7, 7, 5);
  fillRect(frame, centerX - 1, centerY - 1, 3, 3, 1);
}

export function drawTapeLoader(frame: Framebuffer, progress: number): void {
  const loaded = Math.max(0, Math.min(progress, 1));
  const status = loaded === 1 ? STRINGS.ready : STRINGS.loading;
  const counter = Math.floor(loaded * 100)
    .toString()
    .padStart(3, '0');

  fillRect(frame, 172, 8, 136, 64, 5);
  fillRect(frame, 174, 6, 132, 68, 5);
  fillRect(frame, 174, 8, 132, 64, 12);
  fillRect(frame, 178, 12, 124, 20, 1);
  drawText(frame, status, 220 - measureTextWidth(status) / 2, 14, 5);
  drawText(frame, counter, 282 - measureTextWidth(counter) / 2, 14, 6);

  fillRect(frame, 182, 35, 116, 33, 0);
  fillRect(frame, 207, 60, 71, 2, 4);
  drawReel(frame, 207, 1 - loaded);
  drawReel(frame, 277, loaded);
}
