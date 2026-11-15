import { seededRandom } from './random.js';

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

export function createNoise(seed: number): () => number {
  const random = seededRandom(seed);
  return () => 2 * random() - 1;
}

export function createPluck(frequency: number, sampleRate: number, seed: number): () => number {
  // The average of adjacent samples shortens the effective delay by half a sample.
  const length = Math.max(2, Math.round(sampleRate / frequency + 0.5));
  const delay = Float32Array.from({ length }, createNoise(seed));
  let cursor = 0;

  return () => {
    const current = delay[cursor];
    const next = (cursor + 1) % length;
    delay[cursor] = 0.49 * (current + delay[next]);
    cursor = next;
    return current;
  };
}

const drawbars = [
  [1, 1],
  [2, 0.6],
  [3, 0.4],
  [4, 0.2],
  [6, 0.1],
] as const;
const organGain = drawbars.reduce((sum, [, gain]) => sum + gain, 0);

export function organ(seconds: number, frequency: number): number {
  const phase = 2 * Math.PI * frequency * seconds;
  let sum = 0;
  for (const [harmonic, gain] of drawbars) {
    sum += gain * Math.sin(harmonic * phase);
  }
  return sum / organGain;
}
