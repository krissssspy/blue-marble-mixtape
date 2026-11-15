import { describe, expect, it } from 'vitest';
import { RECIPE_CHOICES, validateRecipe } from '../../src/audio/recipe.js';
import { createLabState, LAB_STEPS, stepLab } from '../../src/engine/lab.js';

describe('Lab recipe steps', () => {
  it('cycles the complete catalog independently of the recipe fields', () => {
    const initial = createLabState();
    const last = stepLab(initial, ['left'], 184).state;
    expect(last.artifactIndex).toBe(183);
    expect(stepLab(last, ['right'], 184).state.artifactIndex).toBe(0);
    expect(last.recipe).toEqual(initial.recipe);
    expect(initial.artifactIndex).toBe(0);
    expect(stepLab(initial, ['no'], 184)).toMatchObject({ effect: 'close' });
  });

  it('allows every recipe option and keeps previous selections when backing up', () => {
    let { state } = stepLab(createLabState(), ['yes'], 184);
    for (const [key, values] of Object.entries(RECIPE_CHOICES)) {
      expect(LAB_STEPS[state.step]).toBe(key);
      const seen = new Set();
      for (let index = 0; index < values.length; index += 1) {
        seen.add(state.recipe[key as keyof typeof RECIPE_CHOICES]);
        state = stepLab(state, ['right'], 184).state;
      }
      expect(seen).toEqual(new Set(values));
      state = stepLab(state, ['right', 'yes'], 184).state;
    }
    expect(validateRecipe(state.recipe)).toBe(true);
    expect(LAB_STEPS[state.step]).toBe('play');
    const back = stepLab(state, ['no'], 184).state;
    expect(LAB_STEPS[back.step]).toBe('tempo');
    expect(back.recipe).toEqual(state.recipe);
  });

  it('plays only after explicitly confirming the final step', () => {
    const initial = createLabState();
    expect(stepLab(initial, ['yes'], 1).effect).toBeNull();
    const confirm = stepLab(
      initial,
      Array.from({ length: LAB_STEPS.length - 1 }, () => 'yes'),
      1,
    );
    expect(LAB_STEPS[confirm.state.step]).toBe('play');
    expect(stepLab(confirm.state, ['right'], 1).state).toEqual(confirm.state);
    expect(stepLab(confirm.state, ['yes'], 1)).toEqual({ state: confirm.state, effect: 'play' });
  });
});
