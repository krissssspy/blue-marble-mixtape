import { describe, expect, it } from 'vitest';
import type { InputSample } from '../../src/engine/input-buffer.js';
import { createMuseumState, stepMuseum } from '../../src/engine/museum-state.js';

const idle: InputSample = { left: false, right: false, pressed: [] };

describe('the Welcome state', () => {
  it('begins on the Welcome screen before the first avatar step', () => {
    expect(createMuseumState()).toMatchObject({ screen: 'welcome', avatarStep: 0 });
  });

  it('stays on Welcome without an action', () => {
    const welcome = createMuseumState();

    expect(stepMuseum(welcome, idle)).toEqual({ state: welcome, effect: null });
  });

  it.each(['left', 'right', 'no'] as const)('stays on Welcome on %s', (action) => {
    const welcome = createMuseumState();
    const input: InputSample = {
      left: action === 'left',
      right: action === 'right',
      pressed: [action],
    };

    expect(stepMuseum(welcome, input)).toEqual({ state: welcome, effect: null });
  });

  it('opens the avatar builder and signals audio unlock on the initial yes press only', () => {
    const welcome = Object.freeze(createMuseumState());
    const started = stepMuseum(welcome, { ...idle, pressed: ['yes'] });

    expect(started.state).toMatchObject({ screen: 'avatar', avatarStep: 0 });
    expect(started.effect).toBe('unlock-audio');
    expect(welcome).toMatchObject({ screen: 'welcome', avatarStep: 0 });
    expect(stepMuseum(started.state, idle)).toEqual({ state: started.state, effect: null });
    expect(stepMuseum(started.state, { ...idle, pressed: ['yes'] }).effect).toBeNull();
  });
});
