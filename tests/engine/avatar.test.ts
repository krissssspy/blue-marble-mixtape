import { describe, expect, it } from 'vitest';
import { AVATAR_STEPS, cycleAvatarChoice } from '../../src/engine/avatar.js';

describe('avatar choices', () => {
  it('presents skin, hair, outfit, and headgear in order', () => {
    expect(AVATAR_STEPS.map((step) => step.key)).toEqual(['skin', 'hair', 'outfit', 'headgear']);
  });

  it('provides five distinct hairstyle names and six choices at each other step', () => {
    expect(AVATAR_STEPS[1].choices).toEqual([
      'Short crop',
      'Side sweep',
      'Round afro',
      'Twin braids',
      'High ponytail',
    ]);
    for (const { key, choices } of AVATAR_STEPS) {
      expect(choices, key).toHaveLength(key === 'hair' ? 5 : 6);
      expect(new Set(choices.map((label) => label.trim())).size, key).toBe(choices.length);
      for (const label of choices) {
        expect(label.trim(), key).not.toBe('');
        expect([...label].length, key).toBeLessThanOrEqual(18);
      }
    }
  });

  it.each([
    [2, 'left', 1],
    [2, 'right', 3],
    [0, 'left', 5],
    [5, 'right', 0],
  ] as const)('moves choice %i one slot %s to %i with wraparound', (index, direction, expected) => {
    expect(cycleAvatarChoice(index, direction, 6)).toBe(expected);
  });
});
