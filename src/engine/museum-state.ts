import type { InputSample } from './input-buffer.js';

export interface MuseumState {
  readonly screen: 'welcome' | 'avatar';
  readonly avatarStep: number;
}

interface MuseumStep {
  readonly state: MuseumState;
  readonly effect: 'unlock-audio' | null;
}

export function createMuseumState(): MuseumState {
  return { screen: 'welcome', avatarStep: 0 };
}

export function stepMuseum(state: MuseumState, input: InputSample): MuseumStep {
  if (state.screen === 'welcome' && input.pressed.includes('yes')) {
    return { state: { ...state, screen: 'avatar' }, effect: 'unlock-audio' };
  }
  return { state, effect: null };
}
