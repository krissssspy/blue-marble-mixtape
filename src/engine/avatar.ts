import { AVATAR_LABELS } from '../strings.js';

export const AVATAR_STEPS = [
  { key: 'skin', choices: AVATAR_LABELS.skin },
  { key: 'hair', choices: AVATAR_LABELS.hair },
  { key: 'outfit', choices: AVATAR_LABELS.outfit },
  { key: 'headgear', choices: AVATAR_LABELS.headgear },
] as const;

export function cycleAvatarChoice(index: number, direction: 'left' | 'right'): number {
  const count = AVATAR_LABELS.skin.length;
  const offset = direction === 'left' ? -1 : 1;
  return (index + offset + count) % count;
}

export type AvatarSelection = Readonly<Record<(typeof AVATAR_STEPS)[number]['key'], number>>;

export const DEFAULT_AVATAR: AvatarSelection = { skin: 0, hair: 0, outfit: 0, headgear: 0 };
