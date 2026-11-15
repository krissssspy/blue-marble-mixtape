import { AVATAR_STEPS, DEFAULT_AVATAR, cycleAvatarChoice, type AvatarSelection } from './avatar.js';
import type { InputSample } from './input-buffer.js';

export interface MuseumState {
  readonly screen: 'welcome' | 'avatar' | 'tutorial';
  readonly avatarStep: number;
  readonly avatar: AvatarSelection;
  readonly audioUnlocked: boolean;
}

interface MuseumStep {
  readonly state: MuseumState;
  readonly effect: 'unlock-audio' | null;
}

export function createMuseumState(): MuseumState {
  return { screen: 'welcome', avatarStep: 0, avatar: { ...DEFAULT_AVATAR }, audioUnlocked: false };
}

export function stepMuseum(state: MuseumState, input: InputSample): MuseumStep {
  let current = state;
  let effect: MuseumStep['effect'] = null;
  for (const action of input.pressed) {
    if (current.screen === 'welcome') {
      if (action === 'yes') {
        if (!current.audioUnlocked) effect = 'unlock-audio';
        current = { ...current, screen: 'avatar', audioUnlocked: true };
      }
    } else if (current.screen === 'avatar') {
      if (action === 'yes') {
        if (current.avatarStep === AVATAR_STEPS.length - 1) {
          current = { ...current, screen: 'tutorial' };
        } else {
          current = { ...current, avatarStep: current.avatarStep + 1 };
        }
      } else if (action === 'no') {
        if (current.avatarStep === 0) {
          current = { ...current, screen: 'welcome' };
        } else {
          current = { ...current, avatarStep: current.avatarStep - 1 };
        }
      } else {
        const { key, choices } = AVATAR_STEPS[current.avatarStep];
        const choice = cycleAvatarChoice(current.avatar[key], action, choices.length);
        current = { ...current, avatar: { ...current.avatar, [key]: choice } };
      }
    }
  }
  return { state: current, effect };
}
