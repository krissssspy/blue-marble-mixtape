import { MONTH_ABBREVIATIONS, STRINGS } from '../strings.js';
import { drawText, measureTextWidth } from './font.js';
import { fillRect, type Framebuffer } from './framebuffer.js';

interface ListeningMetadata {
  readonly shortTitle: string;
  readonly displayDate: string;
  readonly genre: string;
}

function drawLabel(frame: Framebuffer, text: string, left: number, top: number): void {
  fillRect(frame, left, top, measureTextWidth(text) + 8, 22, 1);
  drawText(frame, text, left + 4, top + 3, 5);
}

function drawReel(frame: Framebuffer, x: number, y: number, fraction: number): void {
  const radius = Math.round(9 * Math.sqrt(fraction));
  for (let row = -radius; row <= radius; row += 1) {
    const span = Math.floor(Math.sqrt(radius * radius - row * row));
    fillRect(frame, x - span, y + row, span * 2 + 1, 1, 12);
  }
  fillRect(frame, x - 1, y - 1, 3, 3, 5);
}

export function drawListeningOverlay(
  frame: Framebuffer,
  { shortTitle, displayDate, genre }: ListeningMetadata,
  progress: number,
): void {
  const title = shortTitle.toUpperCase();
  const [year, month, day] = displayDate.split('-');
  const date = `${day} ${MONTH_ABBREVIATIONS[Number(month) - 1]} ${year}`;
  const genreLabel = genre.toUpperCase();

  drawLabel(frame, title, Math.floor((frame.width - measureTextWidth(title) - 8) / 2), 4);
  drawLabel(frame, date, 4, 28);
  drawLabel(frame, STRINGS.close, frame.width - measureTextWidth(STRINGS.close) - 12, 28);
  drawLabel(frame, genreLabel, 4, 123);

  const fraction = Math.max(0, Math.min(1, progress));
  fillRect(frame, 12, 148, frame.width - 24, 22, 1);
  drawReel(frame, 29, 159, 1 - fraction);
  drawReel(frame, frame.width - 29, 159, fraction);
  const tapeWidth = frame.width - 92;
  fillRect(frame, 46, 157, tapeWidth, 4, 4);
  fillRect(frame, 46, 157, Math.floor(tapeWidth * fraction), 4, 6);
}
