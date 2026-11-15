import { describe, expect, it } from 'vitest';
import { createFramebuffer, type Framebuffer } from '../../src/engine/framebuffer.js';
import { drawWelcome } from '../../src/engine/welcome.js';

const drawAtTick: (frame: Framebuffer, tick: number) => void = drawWelcome;
const window = { left: 116, top: 84, right: 204, bottom: 118 };

function render(tick: number): Framebuffer {
  const frame = createFramebuffer();
  drawAtTick(frame, tick);
  return frame;
}

function isInsideWindow(x: number, y: number): boolean {
  return x >= window.left && x < window.right && y >= window.top && y < window.bottom;
}

function isLand(index: number): boolean {
  return index === 8 || index === 9;
}

describe('Welcome Earth motion', () => {
  it('keeps the default frame at tick zero and renders each tick deterministically', () => {
    const defaultFrame = createFramebuffer();
    drawWelcome(defaultFrame);

    expect(render(0).pixels).toEqual(defaultFrame.pixels);
    expect(render(12).pixels).toEqual(render(12).pixels);
  });

  it('turns the single central Earth while leaving the cassette, label and hint still', () => {
    const frames = [0, 12, 30].map(render);

    for (const [first, second] of [
      [frames[0], frames[1]],
      [frames[1], frames[2]],
    ]) {
      const backing = first.pixels[window.top * first.width + window.left];
      let landMovedIntoView = false;
      let landMovedOutOfView = false;

      for (const [position, before] of first.pixels.entries()) {
        const after = second.pixels[position];
        if (before === after) continue;

        const x = position % first.width;
        const y = Math.floor(position / first.width);
        expect(isInsideWindow(x, y), 'motion outside the cassette window').toBe(true);
        expect(x).toBeGreaterThanOrEqual(140);
        expect(x).toBeLessThanOrEqual(180);
        expect(before).not.toBe(backing);
        expect(after).not.toBe(backing);
        landMovedIntoView ||= !isLand(before) && isLand(after);
        landMovedOutOfView ||= isLand(before) && !isLand(after);
      }

      expect(landMovedIntoView && landMovedOutOfView, 'land should shift across the Earth').toBe(
        true,
      );
    }
  });
});
