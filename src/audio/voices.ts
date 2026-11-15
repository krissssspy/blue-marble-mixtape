function phaseAt(seconds: number, frequency: number): number {
  const cycles = seconds * frequency;
  return cycles - Math.floor(cycles);
}

export function pulse(seconds: number, frequency: number, dutyCycle: number): number {
  return phaseAt(seconds, frequency) < dutyCycle ? 1 : -1;
}

export function triangle(seconds: number, frequency: number): number {
  return 1 - 4 * Math.abs(phaseAt(seconds, frequency) - 0.5);
}
