import { STRINGS } from '../strings.js';
import { drawText, measureTextWidth } from './font.js';
import { fillRect, type Framebuffer } from './framebuffer.js';

const [question, answers] = STRINGS.listen.split('\n');
const questionWidth = measureTextWidth(question);
const answersWidth = measureTextWidth(answers);
const panelWidth = Math.max(questionWidth, answersWidth) + 16;
const panelHeight = 42;
const edgeMargin = 2;

export function drawListenPrompt(frame: Framebuffer, centerX: number, top: number): void {
  const left = Math.max(
    edgeMargin,
    Math.min(frame.width - panelWidth - edgeMargin, Math.round(centerX - panelWidth / 2)),
  );
  fillRect(frame, left, top, panelWidth, panelHeight, 12);
  fillRect(frame, left + 2, top + 2, panelWidth - 4, panelHeight - 4, 1);
  drawText(frame, question, left + (panelWidth - questionWidth) / 2, top + 4, 5);
  drawText(frame, answers, left + (panelWidth - answersWidth) / 2, top + 20, 6);
}
