import colors from '../../tools/ingest/dusk-palette.json' with { type: 'json' };

export const DUSK_PALETTE: readonly string[] = colors;
export const BACKDROP_RAMP: readonly string[] = DUSK_PALETTE.slice(0, 5);
