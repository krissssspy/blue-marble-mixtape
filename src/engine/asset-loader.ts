import { STRINGS } from '../strings.js';
import { drawText, measureTextWidth } from './font.js';
import { fillRect, type Framebuffer } from './framebuffer.js';

const scannerColumns = [7, 13, 18, 11, 6, 12, 20, 16, 9, 14, 21, 13, 7, 10, 10, 14];

export function drawAssetLoader(frame: Framebuffer, progress: number): void {
  const loaded = Math.max(0, Math.min(progress, 1));
  const status = loaded === 1 ? STRINGS.ready : STRINGS.loading;
  const counter = Math.floor(loaded * 100)
    .toString()
    .padStart(3, '0');

  fillRect(frame, 175, 11, 133, 65, 0);
  fillRect(frame, 172, 9, 136, 63, 2);
  fillRect(frame, 174, 8, 132, 66, 2);
  fillRect(frame, 175, 9, 129, 62, 3);
  fillRect(frame, 174, 8, 130, 1, 11);
  fillRect(frame, 174, 9, 1, 61, 11);
  fillRect(frame, 178, 12, 124, 20, 1);
  drawText(frame, status, 217 - measureTextWidth(status) / 2, 14, 5);
  drawText(frame, counter, 282 - measureTextWidth(counter) / 2, 14, 6);

  fillRect(frame, 178, 33, 124, 33, 0);
  fillRect(frame, 184, 50, 112, 1, 2);
  fillRect(frame, 178, 33, 9, 1, 10);
  fillRect(frame, 178, 34, 1, 7, 10);
  fillRect(frame, 293, 65, 9, 1, 4);
  fillRect(frame, 301, 58, 1, 7, 4);
  const litColumns = Math.floor(scannerColumns.length * loaded);
  for (const [index, height] of scannerColumns.entries()) {
    const x = 184 + index * 7;
    fillRect(frame, x, 51 - Math.floor(height / 2), 3, height, index < litColumns ? 10 : 3);
    fillRect(frame, x, 62, 1, 2, index < litColumns ? 11 : 3);
  }

  fillRect(frame, 187, 68, 106, 4, 1);
  fillRect(frame, 188, 69, 104, 2, 3);
  fillRect(frame, 188, 69, Math.floor(104 * loaded), 2, 10);
}
