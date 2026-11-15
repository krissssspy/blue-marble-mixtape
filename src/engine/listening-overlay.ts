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
  fillRect(frame, left, top, 2, 6, 10);
  drawText(frame, text, left + 4, top + 3, 5);
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
  const trackLeft = 27;
  const trackWidth = frame.width - 54;
  const marker = trackLeft + Math.round((trackWidth - 1) * fraction);
  fillRect(frame, 12, 148, frame.width - 24, 22, 1);
  fillRect(frame, 12, 148, frame.width - 24, 1, 4);
  fillRect(frame, trackLeft, 158, trackWidth, 3, 4);
  fillRect(frame, trackLeft, 158, Math.floor(trackWidth * fraction), 3, 10);
  for (let tick = 0; tick <= 8; tick += 1) {
    const x = trackLeft + Math.round(((trackWidth - 1) * tick) / 8);
    fillRect(frame, x, 164, 1, 2, x <= marker ? 10 : 4);
  }
  fillRect(frame, marker, 154, 1, 13, 11);
  fillRect(frame, marker - 1, 153, 3, 2, 11);
}
