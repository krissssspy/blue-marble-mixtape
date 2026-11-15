export function midiToHz(note: number): number {
  return 440 * 2 ** ((note - 69) / 12);
}
