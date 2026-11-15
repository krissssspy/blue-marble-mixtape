import { envelope } from './envelope.js';
import { scoreDuration, type ScoreEvent } from './score.js';
import { bell, createNoise, createPad, createPluck, organ, pulse, triangle } from './voices.js';

export interface StereoPcm {
  readonly sampleRate: number;
  readonly left: Float32Array;
  readonly right: Float32Array;
}

const noteEnvelope = { attack: 0.008, release: 0.024 };

function voiceFor({ voice, pitch }: ScoreEvent, sampleRate: number, seed: number) {
  switch (voice) {
    case 'pulse':
      return (seconds: number) => pulse(seconds, pitch, 0.25);
    case 'triangle':
      return (seconds: number) => triangle(seconds, pitch);
    case 'noise':
      return createNoise(seed);
    case 'pluck':
      return createPluck(pitch, sampleRate, seed);
    case 'organ':
      return (seconds: number) => organ(seconds, pitch);
    case 'bell':
      return (seconds: number) => bell(seconds, pitch);
    case 'pad':
      return createPad(pitch, sampleRate);
  }
}

export function renderScore(score: readonly ScoreEvent[], sampleRate: number): StereoPcm {
  if (!Number.isInteger(sampleRate) || sampleRate <= 0) {
    throw new RangeError('Sample rate must be a positive integer.');
  }

  const length = Math.ceil(scoreDuration(score) * sampleRate);
  const left = new Float32Array(length);
  const right = new Float32Array(length);

  for (const [index, event] of score.entries()) {
    const { start, duration, loudness, pan } = event;
    const sampleVoice = voiceFor(event, sampleRate, index);
    const gainLeft = Math.sqrt((1 - pan) / 2);
    const gainRight = Math.sqrt((1 + pan) / 2);
    const first = Math.ceil(start * sampleRate);
    const end = Math.ceil((start + duration) * sampleRate);

    for (let sample = first; sample < end; sample += 1) {
      const elapsed = sample / sampleRate - start;
      const value = sampleVoice(elapsed) * envelope(elapsed, duration, noteEnvelope, loudness);
      left[sample] += value * gainLeft;
      right[sample] += value * gainRight;
    }
  }

  for (let sample = 0; sample < length; sample += 1) {
    left[sample] = Math.max(-1, Math.min(1, left[sample]));
    right[sample] = Math.max(-1, Math.min(1, right[sample]));
  }
  return { sampleRate, left, right };
}
