import { STRINGS } from '../strings.js';
import { drawText, measureTextWidth } from './font.js';
import { clearFramebuffer, fillRect, type Framebuffer } from './framebuffer.js';

export function drawFarewell(frame: Framebuffer): void {
  clearFramebuffer(frame, 0);
  fillRect(frame, 30, 30, 260, 120, 12);
  fillRect(frame, 33, 33, 254, 114, 1);
  fillRect(frame, 37, 37, 246, 7, 6);
  for (const [line, text] of STRINGS.farewell.split('\n').entries()) {
    drawText(
      frame,
      text,
      Math.floor((frame.width - measureTextWidth(text)) / 2),
      58 + 22 * line,
      5,
    );
  }
  for (const x of [58, 244]) {
    fillRect(frame, x, 112, 18, 18, 12);
    fillRect(frame, x + 4, 116, 10, 10, 0);
    fillRect(frame, x + 7, 119, 4, 4, 6);
  }
  drawText(
    frame,
    STRINGS.close,
    Math.floor((frame.width - measureTextWidth(STRINGS.close)) / 2),
    114,
    5,
  );
}
