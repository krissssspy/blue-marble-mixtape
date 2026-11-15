import { describe, expect, it } from 'vitest';
import { loadAvatar, saveAvatar } from '../../src/engine/avatar-storage.js';

const defaults = { skin: 0, hair: 0, outfit: 0, headgear: 0 };

function memoryStorage(initial: string | null = null) {
  const values = new Map<string, string>();

  return {
    getItem: (key: string) => values.get(key) ?? initial,
    setItem: (key: string, value: string) => {
      values.set(key, value);
    },
  };
}

describe('avatar storage', () => {
  it('round-trips the confirmed choices', () => {
    const storage = memoryStorage();
    const chosen = { skin: 5, hair: 4, outfit: 2, headgear: 1 };

    expect(loadAvatar(storage)).toEqual(defaults);
    saveAvatar(storage, chosen);
    expect(loadAvatar(storage)).toEqual(chosen);
  });

  it.each([null, '{broken', 'null', '[]', 'false', '{"unrelated":4}'])(
    'defaults every choice for unusable saved data %j',
    (stored) => {
      expect(loadAvatar(memoryStorage(stored))).toEqual(defaults);
    },
  );

  it('keeps valid fields while defaulting missing, out-of-range and non-numeric fields', () => {
    expect(loadAvatar(memoryStorage('{"skin":2,"hair":-1,"outfit":"4"}'))).toEqual({
      skin: 2,
      hair: 0,
      outfit: 0,
      headgear: 0,
    });
  });

  it('defaults fractional choices and choices above five', () => {
    expect(loadAvatar(memoryStorage('{"skin":3.5,"hair":5,"outfit":6,"headgear":2}'))).toEqual({
      skin: 0,
      hair: 5,
      outfit: 0,
      headgear: 2,
    });
  });

  it('uses defaults and keeps play available when storage access is denied', () => {
    const storage = {
      getItem: () => {
        throw new DOMException('Storage is unavailable', 'SecurityError');
      },
      setItem: () => {
        throw new DOMException('Storage is unavailable', 'SecurityError');
      },
    };

    expect(loadAvatar(storage)).toEqual(defaults);
    expect(() => saveAvatar(storage, { ...defaults, outfit: 2 })).not.toThrow();
  });
});
