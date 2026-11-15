import { STRINGS } from '../strings.js';
import { drawText, measureTextWidth } from './font.js';
import { fillRect, type Framebuffer } from './framebuffer.js';

function drawReel(frame: Framebuffer, centerX: number, fraction: number): void {
  const centerY = 51;
  const radius = Math.round(13 * Math.sqrt(fraction));
  for (let y = -radius; y <= radius; y += 1) {
    const span = Math.floor(Math.sqrt(radius * radius - y * y));
    fillRect(frame, centerX - span, centerY + y, span * 2 + 1, 1, y <= 0 ? 12 : 4);
  }
  fillRect(frame, centerX - 3, centerY - 3, 7, 7, 11);
  fillRect(frame, centerX - 2, centerY + 2, 5, 2, 12);
  fillRect(frame, centerX - 1, centerY - 1, 3, 3, 1);
}

export function drawTapeLoader(frame: Framebuffer, progress: number): void {
  const loaded = Math.max(0, Math.min(progress, 1));
  const status = loaded === 1 ? STRINGS.ready : STRINGS.loading;
  const counter = Math.floor(loaded * 100)
    .toString()
    .padStart(3, '0');

  fillRect(frame, 175, 11, 133, 65, 0);
  fillRect(frame, 172, 9, 136, 63, 2);
  fillRect(frame, 174, 8, 132, 66, 2);
  fillRect(frame, 174, 8, 130, 63, 4);
  fillRect(frame, 174, 8, 130, 1, 11);
  fillRect(frame, 174, 9, 1, 61, 11);
  fillRect(frame, 178, 12, 124, 20, 1);
  drawText(frame, status, 217 - measureTextWidth(status) / 2, 14, 5);
  drawText(frame, counter, 282 - measureTextWidth(counter) / 2, 14, 6);

  fillRect(frame, 178, 33, 42, 2, 6);
  fillRect(frame, 220, 33, 40, 2, 7);
  fillRect(frame, 260, 33, 42, 2, 10);
  fillRect(frame, 182, 36, 116, 31, 0);
  fillRect(frame, 184, 37, 112, 1, 3);
  fillRect(frame, 207, 60, 71, 2, 4);
  fillRect(frame, 224, 48, 36, 7, 1);
  for (let x = 229; x < 260; x += 8) fillRect(frame, x, 50, 1, 3, 12);
  drawReel(frame, 207, 1 - loaded);
  drawReel(frame, 277, loaded);

  fillRect(frame, 187, 68, 106, 4, 1);
  fillRect(frame, 188, 69, 104, 2, 3);
  fillRect(frame, 188, 69, Math.floor(104 * loaded), 2, 10);
}
