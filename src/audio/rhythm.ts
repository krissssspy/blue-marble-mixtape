export function euclideanRhythm(pulses: number, steps: number): boolean[] {
  return Array.from({ length: steps }, (_, i) => (i * pulses) % steps < pulses);
}
