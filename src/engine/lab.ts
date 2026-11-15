import { DEFAULT_RECIPE, RECIPE_CHOICES, type Recipe } from '../audio/recipe.js';
import type { MuseumAction } from './input-map.js';

export const LAB_STEPS = [
  'artifact',
  'scan',
  'pitchSource',
  'loudnessSource',
  'scale',
  'voice',
  'rhythm',
  'tempo',
  'play',
] as const;

export interface LabState {
  readonly step: number;
  readonly artifactIndex: number;
  readonly recipe: Recipe;
}

export function createLabState(): LabState {
  return { step: 0, artifactIndex: 0, recipe: DEFAULT_RECIPE };
}

function cycle(index: number, offset: number, count: number): number {
  return (index + offset + count) % count;
}

export function stepLab(
  initial: LabState,
  pressed: readonly MuseumAction[],
  artifactCount: number,
): { state: LabState; effect: 'play' | 'close' | null } {
  let state = initial;
  for (const action of pressed) {
    const field = LAB_STEPS[state.step];
    if (action === 'yes') {
      if (field === 'play') return { state, effect: 'play' };
      state = { ...state, step: state.step + 1 };
    } else if (action === 'no') {
      if (field === 'artifact') return { state, effect: 'close' };
      state = { ...state, step: state.step - 1 };
    } else if (field !== 'play') {
      const offset = action === 'left' ? -1 : 1;
      if (field === 'artifact') {
        state = { ...state, artifactIndex: cycle(state.artifactIndex, offset, artifactCount) };
      } else {
        const choices = RECIPE_CHOICES[field];
        const selected = choices.findIndex((choice) => choice === state.recipe[field]);
        state = {
          ...state,
          recipe: { ...state.recipe, [field]: choices[cycle(selected, offset, choices.length)] },
        };
      }
    }
  }
  return { state, effect: null };
}
