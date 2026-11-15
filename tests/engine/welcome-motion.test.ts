import { describe, expect, it } from 'vitest';
import { createFramebuffer, type Framebuffer } from '../../src/engine/framebuffer.js';
import { motionFrame } from '../../src/engine/motion-preference.js';
import { drawWelcome } from '../../src/engine/welcome.js';

const drawAtTick: (frame: Framebuffer, tick: number) => void = drawWelcome;
const earth = { x: 240, y: 85, radius: 52 };

function render(tick: number, reducedMotion = false): Framebuffer {
  const frame = createFramebuffer();
  drawAtTick(frame, motionFrame(tick, reducedMotion).backgroundTick);
  return frame;
}

function isLand(index: number): boolean {
  return index === 8 || index === 9;
}

describe('Welcome Earth motion', () => {
  it('keeps the default frame at tick zero and renders each tick deterministically', () => {
    const defaultFrame = createFramebuffer();
    drawWelcome(defaultFrame);

    expect(render(0).pixels).toEqual(defaultFrame.pixels);
    expect(render(9).pixels).toEqual(defaultFrame.pixels);
    expect(render(10).pixels).not.toEqual(defaultFrame.pixels);
    expect(render(12).pixels).toEqual(render(12).pixels);
    expect(render(120, true).pixels).toEqual(defaultFrame.pixels);
  });

  it('loops a complete revolution and wraps an earlier frame', () => {
    expect(render(720).pixels).toEqual(render(0).pixels);
    expect(render(-10).pixels).toEqual(render(710).pixels);
  });

  it('turns the Earth while leaving the orbit, title and controls still', () => {
    const frames = [0, 24, 52].map((tick) => render(tick));

    for (const [first, second] of [
      [frames[0], frames[1]],
      [frames[1], frames[2]],
    ]) {
      let landMovedIntoView = false;
      let landMovedOutOfView = false;
      for (const [position, before] of first.pixels.entries()) {
        const after = second.pixels[position];
        if (before === after) continue;

        const x = position % first.width;
        const y = Math.floor(position / first.width);
        expect((x - earth.x) ** 2 + (y - earth.y) ** 2).toBeLessThanOrEqual(earth.radius ** 2);
        landMovedIntoView ||= !isLand(before) && isLand(after);
        landMovedOutOfView ||= isLand(before) && !isLand(after);
      }

      expect(landMovedIntoView && landMovedOutOfView, 'land should shift across the Earth').toBe(
        true,
      );
    }
  });
});
