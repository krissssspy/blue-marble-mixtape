import { SCALE_NAMES } from './scale.js';
import { VOICE_NAMES } from './score.js';

export const RECIPE_CHOICES = {
  scan: [
    'lineSweep',
    'radarSweep',
    'hilbertCurve',
    'ploughPath',
    'spiral',
    'streamlines',
    'hotspots',
  ],
  pitchSource: ['brightness', 'hue', 'height', 'edges', 'motion'],
  loudnessSource: ['brightness', 'saturation', 'edges', 'motion'],
  scale: SCALE_NAMES,
  voice: VOICE_NAMES,
  rhythm: ['free', 'grid', 'euclidean'],
  tempo: ['slow', 'medium', 'fast'],
} as const;

export type Recipe = {
  readonly [Field in keyof typeof RECIPE_CHOICES]: (typeof RECIPE_CHOICES)[Field][number];
};

const choices = Object.entries(RECIPE_CHOICES);

export function validateRecipe(input: unknown): input is Recipe {
  if (input === null || typeof input !== 'object') return false;
  const recipe = input as Record<string, unknown>;
  return (
    Object.keys(recipe).length === choices.length &&
    choices.every(
      ([field, values]) =>
        Object.hasOwn(recipe, field) && values.some((value) => value === recipe[field]),
    )
  );
}
