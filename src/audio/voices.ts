function phaseAt(seconds: number, frequency: number): number {
  const cycles = seconds * frequency;
  return cycles - Math.floor(cycles);
}

export function pulse(seconds: number, frequency: number, dutyCycle: number): number {
  return phaseAt(seconds, frequency) < dutyCycle ? 1 : -1;
}
