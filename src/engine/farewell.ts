import { STRINGS } from '../strings.js';
import { drawText, measureTextWidth } from './font.js';
import { clearFramebuffer, fillRect, type Framebuffer } from './framebuffer.js';

function drawPlanet(frame: Framebuffer): void {
  const centerX = 237;
  const centerY = 72;
  for (let point = 0; point < 96; point += 1) {
    const phase = (point * Math.PI) / 48;
    const x = 42 * Math.cos(phase);
    const y = 14 * Math.sin(phase);
    fillRect(
      frame,
      centerX + Math.round(0.91 * x + 0.42 * y),
      centerY + Math.round(0.91 * y - 0.42 * x),
      1,
      1,
      point < 48 ? 12 : 4,
    );
  }
  for (let row = -28; row <= 28; row += 1) {
    const span = Math.floor(Math.sqrt(28 ** 2 - row ** 2));
    fillRect(frame, centerX - span, centerY + row, 2 * span + 1, 1, row <= 0 ? 10 : 3);
  }
  for (let row = -25; row <= 25; row += 1) {
    const span = Math.floor(Math.sqrt(25 ** 2 - row ** 2));
    fillRect(frame, centerX - span, centerY + row, 2 * span + 1, 1, 3);
    fillRect(frame, centerX - span, centerY + row, Math.floor((3 * span) / 2) + 1, 1, 4);
  }
  for (const [x, y, width] of [
    [225, 53, 17],
    [220, 55, 25],
    [218, 57, 22],
    [218, 59, 17],
    [221, 61, 21],
    [224, 63, 12],
    [227, 65, 6],
    [235, 75, 15],
    [231, 77, 19],
    [233, 79, 13],
    [234, 81, 11],
    [236, 83, 9],
    [236, 85, 6],
    [237, 87, 3],
  ]) {
    fillRect(frame, x, y, width, 2, y < 66 ? 10 : 9);
  }
}

export function drawFarewell(frame: Framebuffer): void {
  clearFramebuffer(frame, 0);
  for (const [x, y] of [
    [20, 34],
    [44, 17],
    [96, 156],
    [183, 16],
    [267, 164],
    [304, 45],
    [298, 143],
  ]) {
    fillRect(frame, x, y, 1, 1, 12);
  }
  fillRect(frame, 29, 31, 264, 121, 4);
  fillRect(frame, 31, 33, 260, 117, 1);
  fillRect(frame, 29, 31, 22, 1, 11);
  fillRect(frame, 29, 32, 1, 17, 10);
  fillRect(frame, 42, 109, 238, 1, 3);
  drawPlanet(frame);
  for (const [line, text] of STRINGS.farewell.split('\n').entries()) {
    drawText(frame, text, 46, 56 + 23 * line, line === 0 ? 5 : 11);
  }
  for (const [index, label] of [STRINGS.credits, STRINGS.close].entries()) {
    const left = 42 + 122 * index;
    fillRect(frame, left, 118, 116, 24, 4);
    fillRect(frame, left + 1, 119, 114, 22, 0);
    drawText(frame, label, left + Math.floor((116 - measureTextWidth(label)) / 2), 122, 5);
  }
}
