import { AVATAR_STEPS, DEFAULT_AVATAR, type AvatarSelection } from './avatar.js';

type AvatarStorage = Pick<Storage, 'getItem' | 'setItem'>;
const storageKey = 'overtone.avatar';
const legacyStorageKey = 'blue-marble-mixtape.avatar';
const version = 1;
const legacyHairChoices = [0, 1, 1, 2, 3, 4] as const;

export function loadAvatar(storage: AvatarStorage | null | undefined): AvatarSelection {
  const avatar = { ...DEFAULT_AVATAR };
  try {
    const saved = storage?.getItem(storageKey) ?? storage?.getItem(legacyStorageKey);
    const data: unknown = JSON.parse(saved ?? 'null');
    if (typeof data !== 'object' || data === null) return avatar;

    const fields = data as Record<string, unknown>;
    for (const { key, choices } of AVATAR_STEPS) {
      const stored = fields[key];
      const value =
        key === 'hair' && fields.version === undefined && typeof stored === 'number'
          ? legacyHairChoices[stored]
          : stored;
      if (
        typeof value === 'number' &&
        Number.isInteger(value) &&
        value >= 0 &&
        value < choices.length
      ) {
        avatar[key] = value;
      }
    }
  } catch {
    // Avatar customization is still available if storage or saved data is unavailable.
  }
  return avatar;
}

export function saveAvatar(
  storage: AvatarStorage | null | undefined,
  avatar: AvatarSelection,
): void {
  try {
    storage?.setItem(storageKey, JSON.stringify({ ...avatar, version }));
  } catch {
    // The current selections remain available in memory.
  }
}
