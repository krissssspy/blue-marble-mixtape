import { describe, expect, it, vi } from 'vitest';
import { createFixedStepper } from '../../src/engine/fixed-step.js';

describe('createFixedStepper', () => {
  it('accumulates fractional frame time until each 60 Hz step is due', () => {
    const step = vi.fn();
    const stepper = createFixedStepper(step);
    const waiting = { left: false, right: false, pressed: [] };
    const walking = { left: true, right: false, pressed: [] };

    stepper.advance(8, waiting);
    stepper.advance(8, waiting);
    expect(step).not.toHaveBeenCalled();

    stepper.advance(1, walking);
    expect(step.mock.calls).toEqual([[walking]]);

    stepper.advance(16, walking);
    expect(step).toHaveBeenCalledTimes(1);
    stepper.advance(1, walking);
    expect(step.mock.calls).toEqual([[walking], [walking]]);
  });

  it('advances exactly sixty steps in one second while movement stays held', () => {
    const step = vi.fn();
    const stepper = createFixedStepper(step);
    const walking = { left: false, right: true, pressed: [] };

    stepper.advance(1000, walking);

    expect(step.mock.calls).toEqual(Array.from({ length: 60 }, () => [walking]));
  });

  it('queues presses from partial frames and delivers them once on the next step', () => {
    const step = vi.fn();
    const stepper = createFixedStepper(step);

    stepper.advance(2, { left: true, right: false, pressed: ['yes'] });
    stepper.advance(3, { left: true, right: false, pressed: ['right', 'no'] });
    expect(step).not.toHaveBeenCalled();

    stepper.advance(45, { left: false, right: true, pressed: ['left', 'yes'] });
    expect(step.mock.calls).toEqual([
      [{ left: false, right: true, pressed: ['yes', 'right', 'no', 'left', 'yes'] }],
      [{ left: false, right: true, pressed: [] }],
      [{ left: false, right: true, pressed: [] }],
    ]);
  });
});
