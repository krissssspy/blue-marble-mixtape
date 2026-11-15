export type ScaleName =
  'majorPentatonic' | 'minorPentatonic' | 'dorian' | 'phrygian' | 'wholeTone' | 'chromatic';

const OFFSETS: Record<ScaleName, readonly number[]> = {
  majorPentatonic: [0, 2, 4, 7, 9],
  minorPentatonic: [0, 3, 5, 7, 10],
  dorian: [0, 2, 3, 5, 7, 9, 10],
  phrygian: [0, 1, 3, 5, 7, 8, 10],
  wholeTone: [0, 2, 4, 6, 8, 10],
  chromatic: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
};

export const SCALE_NAMES = Object.keys(OFFSETS) as readonly ScaleName[];

export function scaleNote(
  value: number,
  scale: ScaleName,
  rootNote: number,
  octaves: number,
): number {
  const offsets = OFFSETS[scale];
  const count = offsets.length * octaves;
  const index = Math.min(Math.floor(Math.max(0, value) * count), count - 1);
  return rootNote + 12 * Math.floor(index / offsets.length) + offsets[index % offsets.length];
}
