import type { StereoPcm } from './render.js';

export interface ConsoleSettings {
  readonly sampleRate: number;
  readonly bitDepth: number;
}

export function applyConsoleBus(
  pcm: StereoPcm,
  { sampleRate, bitDepth }: ConsoleSettings,
): StereoPcm {
  if (!Number.isInteger(sampleRate) || sampleRate < 1 || sampleRate > pcm.sampleRate) {
    throw new RangeError(
      'Console sample rate must be a positive integer at or below the mix rate.',
    );
  }
  if (!Number.isInteger(bitDepth) || bitDepth < 1 || bitDepth > 24) {
    throw new RangeError('Console bit depth must be an integer from 1 to 24.');
  }
  if (pcm.left.length !== pcm.right.length) throw new RangeError('Unequal channel lengths.');

  const steps = 2 ** (bitDepth - 1);
  function quantize(sample: number): number {
    return Math.max(-steps, Math.min(steps - 1, Math.round(sample * steps))) / steps;
  }

  const ratio = pcm.sampleRate / sampleRate;
  const length = Math.ceil(pcm.left.length / ratio);
  const left = new Float32Array(length);
  const right = new Float32Array(length);
  for (let index = 0; index < length; index += 1) {
    const source = Math.floor(index * ratio);
    left[index] = quantize(pcm.left[source]);
    right[index] = quantize(pcm.right[source]);
  }
  return { sampleRate, left, right };
}
