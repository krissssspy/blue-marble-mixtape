import colors from '../../tools/ingest/dusk-palette.json' with { type: 'json' };

export const DUSK_PALETTE: readonly string[] = colors;
export const BACKDROP_RAMP: readonly string[] = DUSK_PALETTE.slice(0, 5);

const firstSkinSwatch = DUSK_PALETTE.length;
const skinSwatches = ['#dea979', '#bf894f', '#7e573d'];
// Garment swatches are ordered base, shadow, highlight.
const shirtSwatches = [
  ['#9bf6ff', '#62c3d1', '#dcfcff'],
  ['#4ab878', '#379f63', '#83dc9a'],
  ['#ff6b6b', '#d86873', '#ffabb0'],
  ['#ffcc33', '#d99e30', '#ffeb9a'],
  ['#9aacca', '#7d90b4', '#cbd7e8'],
  ['#2ec4b6', '#289d92', '#78eee0'],
] as const;
const trouserSwatches = ['#8fa4c1', '#768db2', '#b9ccea'];
const hairSwatches = ['#805357', '#c58e80'];
const firstShirtSwatch = firstSkinSwatch + skinSwatches.length;
const firstTrouserSwatch = firstShirtSwatch + shirtSwatches.length * 3;

function shadeIndices(start: number) {
  return [start, start + 1, start + 2] as const;
}

export const FRAME_PALETTE = [
  ...DUSK_PALETTE,
  ...skinSwatches,
  ...shirtSwatches.flat(),
  ...trouserSwatches,
  ...hairSwatches,
];
export const AVATAR_SKIN_INDICES = [
  15,
  firstSkinSwatch,
  firstSkinSwatch + 1,
  14,
  firstSkinSwatch + 2,
  13,
];
export const AVATAR_SHIRT_INDICES = shirtSwatches.map((_, index) =>
  shadeIndices(firstShirtSwatch + index * 3),
);
export const AVATAR_TROUSER_INDICES = shadeIndices(firstTrouserSwatch);
const firstHairSwatch = firstTrouserSwatch + trouserSwatches.length;
export const AVATAR_HAIR_INDICES = [firstHairSwatch, firstHairSwatch + 1] as const;
