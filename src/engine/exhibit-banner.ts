import { drawText, measureTextWidth } from './font.js';
import { fillRect, type Framebuffer } from './framebuffer.js';

const orbit = [
  [15, 14],
  [17, 15],
  [19, 16],
  [22, 18],
  [24, 20],
  [27, 22],
  [29, 24],
  [31, 25],
] as const;

export function drawExhibitBanner(frame: Framebuffer, exhibitNumber: number, room: string): void {
  const label = `${exhibitNumber} ${room.toUpperCase()}`;
  const textLeft = 46;
  const panelLeft = 6;
  const panelWidth = textLeft - panelLeft + measureTextWidth(label) + 8;
  fillRect(frame, panelLeft, 6, panelWidth, 28, 4);
  fillRect(frame, panelLeft + 2, 8, panelWidth - 4, 24, 1);
  fillRect(frame, panelLeft, 6, 14, 1, 11);
  fillRect(frame, panelLeft, 7, 1, 12, 10);

  fillRect(frame, 12, 19, 25, 1, 4);
  fillRect(frame, 23, 12, 1, 16, 4);
  for (const [x, y] of orbit) fillRect(frame, x, y, 2, 1, 10);
  fillRect(frame, 22, 18, 3, 3, 11);

  drawText(frame, label, textLeft, 12, 5);
}
