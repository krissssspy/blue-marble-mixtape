import { describe, expect, it } from 'vitest';
import type { MuseumAction } from '../../src/engine/input-map.js';
import { createMuseumState, stepMuseum, type MuseumState } from '../../src/engine/museum-state.js';

const defaults = { skin: 0, hair: 0, outfit: 0, headgear: 0 };

function press(state: MuseumState, ...pressed: MuseumAction[]) {
  return stepMuseum(state, {
    left: pressed.includes('left'),
    right: pressed.includes('right'),
    pressed,
  });
}

function startAvatar(): MuseumState {
  return press(createMuseumState(), 'yes').state;
}

describe('avatar customization', () => {
  it('starts every appearance at its first choice', () => {
    expect(createMuseumState()).toMatchObject({ avatar: defaults });
    expect(startAvatar()).toMatchObject({ screen: 'avatar', avatarStep: 0, avatar: defaults });
  });

  it('cycles only the current choice on a fresh press and leaves past state intact', () => {
    const before = startAvatar();
    const changed = press(before, 'left');

    expect(changed).toMatchObject({
      state: { screen: 'avatar', avatarStep: 0, avatar: { ...defaults, skin: 5 } },
      effect: null,
    });
    expect(before).toMatchObject({ avatar: defaults });
    expect(stepMuseum(changed.state, { left: true, right: false, pressed: [] })).toEqual({
      state: changed.state,
      effect: null,
    });
    expect(press(changed.state, 'right').state).toMatchObject({ avatar: defaults });
  });

  it('applies queued presses in order when they span two avatar steps', () => {
    const changed = press(startAvatar(), 'right', 'yes', 'right');

    expect(changed).toMatchObject({
      state: { screen: 'avatar', avatarStep: 1, avatar: { ...defaults, skin: 1, hair: 1 } },
      effect: null,
    });
  });

  it('confirms each step in order and enters the tutorial after headgear', () => {
    let state = startAvatar();

    for (const step of [1, 2, 3, 4]) {
      const changed = press(state, 'right');
      const confirmed = press(changed.state, 'yes');

      expect(changed.effect).toBeNull();
      expect(confirmed.effect).toBeNull();
      if (step < 4) expect(confirmed.state).toMatchObject({ screen: 'avatar', avatarStep: step });
      state = confirmed.state;
    }

    const avatar = { skin: 1, hair: 1, outfit: 1, headgear: 1 };
    expect(state).toMatchObject({ screen: 'tutorial', avatar });
    expect(press(state, 'right').state).toMatchObject({ avatar });
    expect(press(state, 'no').state).toMatchObject({ avatar });
  });

  it('keeps earlier selections when navigating backward and forward', () => {
    const skin = press(startAvatar(), 'right').state;
    const hair = press(press(skin, 'yes').state, 'left').state;
    const outfit = press(press(hair, 'yes').state, 'right').state;
    const backToHair = press(outfit, 'no');

    const expected = { skin: 1, hair: 5, outfit: 1, headgear: 0 };
    expect(backToHair).toMatchObject({
      state: { screen: 'avatar', avatarStep: 1, avatar: expected },
      effect: null,
    });
    expect(press(backToHair.state, 'yes').state).toMatchObject({
      screen: 'avatar',
      avatarStep: 2,
      avatar: expected,
    });

    const backToSkin = press(backToHair.state, 'no');
    expect(backToSkin.state).toMatchObject({ screen: 'avatar', avatarStep: 0, avatar: expected });
    const backToWelcome = press(backToSkin.state, 'no');
    expect(backToWelcome).toMatchObject({
      state: { screen: 'welcome', avatar: expected },
      effect: null,
    });
    expect(press(backToWelcome.state, 'yes')).toMatchObject({
      state: { screen: 'avatar', avatarStep: 0, avatar: expected },
      effect: null,
    });
  });
});
