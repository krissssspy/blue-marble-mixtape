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

  it('reads a legacy key and saves confirmed choices under the Overtone key', () => {
    const storage = memoryStorage();
    const old = { skin: 5, hair: 5, outfit: 3, headgear: 1 };
    const migrated = { ...old, hair: 4 };
    storage.setItem('blue-marble-mixtape.avatar', JSON.stringify(old));

    expect(loadAvatar(storage)).toEqual(migrated);
    const chosen = { ...migrated, hair: 3 };
    saveAvatar(storage, chosen);
    expect(JSON.parse(storage.getItem('overtone.avatar')!)).toEqual({ ...chosen, version: 1 });
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

  it('defaults fractional choices and out-of-range current choices', () => {
    expect(
      loadAvatar(memoryStorage('{"version":1,"skin":3.5,"hair":5,"outfit":6,"headgear":2}')),
    ).toEqual({
      skin: 0,
      hair: 0,
      outfit: 0,
      headgear: 2,
    });
    expect(
      loadAvatar(memoryStorage('{"version":1,"skin":-2,"hair":-1,"outfit":2,"headgear":-1}')),
    ).toEqual({ ...defaults, outfit: 2 });
  });

  it.each([0, 1, 1, 2, 3, 4].map((expected, old) => ({ old, expected })))(
    "preserves a visitor's pre-existing hairstyle $old as $expected",
    ({ old, expected }) => {
      const storage = memoryStorage(JSON.stringify({ ...defaults, skin: 5, hair: old, outfit: 3 }));
      const migrated = { ...defaults, skin: 5, hair: expected, outfit: 3 };
      expect(loadAvatar(storage)).toEqual(migrated);
      saveAvatar(storage, migrated);
      expect(loadAvatar(storage)).toEqual(migrated);
    },
  );

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
