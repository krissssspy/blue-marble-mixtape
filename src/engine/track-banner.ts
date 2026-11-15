import { drawText, measureTextWidth } from './font.js';
import { fillRect, type Framebuffer } from './framebuffer.js';

export function drawTrackBanner(frame: Framebuffer, track: number, room: string): void {
  const label = `${track} ${room.toUpperCase()}`;
  const textLeft = 46;
  const panelLeft = 6;
  const panelWidth = textLeft - panelLeft + measureTextWidth(label) + 8;
  fillRect(frame, panelLeft, 6, panelWidth, 28, 12);
  fillRect(frame, panelLeft + 2, 8, panelWidth - 4, 24, 1);

  fillRect(frame, 12, 12, 27, 16, 12);
  fillRect(frame, 14, 14, 23, 12, 0);
  fillRect(frame, 17, 17, 5, 5, 5);
  fillRect(frame, 29, 17, 5, 5, 5);
  fillRect(frame, 22, 23, 7, 1, 4);

  drawText(frame, label, textLeft, 12, 5);
}
