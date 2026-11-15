import type { InputSample } from './input-buffer.js';
import type { MuseumAction } from './input-map.js';

const stepsPerSecond = 60;
const millisecondsPerSecond = 1000;

export function createFixedStepper(step: (input: InputSample) => void) {
  // Each millisecond adds 60 units, and 1,000 units make one simulation step.
  let elapsedUnits = 0;
  let pending: MuseumAction[] = [];

  return {
    advance(elapsedMs: number, { left, right, pressed }: InputSample): void {
      elapsedUnits += elapsedMs * stepsPerSecond;
      pending.push(...pressed);

      const steps = Math.floor(elapsedUnits / millisecondsPerSecond);
      if (steps === 0) return;
      elapsedUnits -= steps * millisecondsPerSecond;

      const firstPresses = pending;
      pending = [];
      for (let index = 0; index < steps; index += 1) {
        step({ left, right, pressed: index === 0 ? firstPresses : [] });
      }
    },
  };
}
