import { describe, expect, it } from 'vitest';
import { validateRecipe } from '../../src/audio/recipe.js';

const recipe = {
  scan: 'lineSweep',
  pitchSource: 'brightness',
  loudnessSource: 'saturation',
  scale: 'minorPentatonic',
  voice: 'triangle',
  rhythm: 'free',
  tempo: 'medium',
};

const choices = {
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
  scale: ['majorPentatonic', 'minorPentatonic', 'dorian', 'phrygian', 'wholeTone', 'chromatic'],
  voice: ['pulse', 'triangle', 'noise', 'pluck', 'organ', 'bell', 'pad'],
  rhythm: ['free', 'grid', 'euclidean'],
  tempo: ['slow', 'medium', 'fast'],
};

describe('lab recipe validation', () => {
  it.each(Object.entries(choices))('accepts every allowed %s choice from JSON', (field, values) => {
    for (const value of values) {
      expect(validateRecipe(JSON.parse(JSON.stringify({ ...recipe, [field]: value })))).toBe(true);
    }
  });

  it.each(Object.keys(choices))('rejects a missing or invalid %s setting', (field) => {
    const missing: Record<string, unknown> = { ...recipe };
    delete missing[field];
    expect(validateRecipe(missing)).toBe(false);
    expect(validateRecipe({ ...recipe, [field]: '' })).toBe(false);
    expect(validateRecipe({ ...recipe, [field]: 42 })).toBe(false);
  });

  it('rejects invalid input shapes, cross-domain choices, and extra settings', () => {
    for (const invalid of [
      null,
      undefined,
      [recipe],
      'lineSweep',
      Object.create(recipe),
      { ...recipe, pitchSource: 'saturation' },
      { ...recipe, loudnessSource: 'height' },
      { ...recipe, preset: 'favorite' },
    ]) {
      expect(validateRecipe(invalid)).toBe(false);
    }
  });
});
