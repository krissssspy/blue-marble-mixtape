import colors from '../../tools/ingest/dusk-palette.json' with { type: 'json' };

export const DUSK_PALETTE: readonly string[] = colors;
export const BACKDROP_RAMP: readonly string[] = DUSK_PALETTE.slice(0, 5);

const firstSkinSwatch = DUSK_PALETTE.length;
export const FRAME_PALETTE = [...DUSK_PALETTE, '#dea979', '#bf894f', '#7e573d'];
export const AVATAR_SKIN_INDICES = [
  15,
  firstSkinSwatch,
  firstSkinSwatch + 1,
  14,
  firstSkinSwatch + 2,
  13,
];
