import { afterEach, describe, expect, it, vi } from 'vitest';
import { applyConsoleBus } from '../../src/audio/console-bus.js';
import { renderScore } from '../../src/audio/render.js';
import type { ScoreEvent } from '../../src/audio/score.js';

const score: ScoreEvent[] = [
  {
    voice: 'triangle',
    start: 0,
    duration: 0.014,
    pitch: 460,
    loudness: 0.8,
    pan: -0.5,
    location: { kind: 'point', x: 0.2, y: 0.3 },
  },
];

afterEach(() => vi.unstubAllGlobals());

describe('worklet score output', () => {
  it('plays deterministic console audio in consecutive stereo blocks and reports the audio clock', async () => {
    const sampleRate = 48000;
    const register = vi.fn();
    const port = { onmessage: null, postMessage: vi.fn() };
    vi.stubGlobal('sampleRate', sampleRate);
    vi.stubGlobal('currentTime', 6.25);
    vi.stubGlobal(
      'AudioWorkletProcessor',
      class {
        port = port;
      },
    );
    vi.stubGlobal('registerProcessor', register);
    await import('../../src/audio/score-worklet.js');
    expect(register).toHaveBeenCalledExactlyOnceWith('blue-marble-score', expect.any(Function));
    const Processor = register.mock.calls[0][1];
    const processor = new Processor();
    const block = () => [new Float32Array(128), new Float32Array(128)];
    expect(processor.process([], [block()])).toBe(true);
    expect(port.postMessage).not.toHaveBeenCalled();
    processor.port.onmessage({ data: score });

    const left: number[] = [];
    const right: number[] = [];
    const playback = Array.from({ length: 6 }, () => {
      const output = block();
      const playing = processor.process([], [output]);
      left.push(...output[0]);
      right.push(...output[1]);
      return playing;
    });
    expect(playback).toEqual([true, true, true, true, true, false]);
    expect(port.postMessage.mock.calls).toEqual([[{ startedAt: 6.25 }], [{ ended: true }]]);
    const pcm = applyConsoleBus(renderScore(score, sampleRate), { sampleRate: 22050, bitDepth: 8 });
    const expected = (channel: Float32Array) =>
      left.map((_, index) => channel[Math.floor((index * 22050) / sampleRate)] ?? 0);
    expect(left).toEqual(expected(pcm.left));
    expect(right).toEqual(expected(pcm.right));
    expect(left.some((sample) => sample !== 0)).toBe(true);
    expect(right).not.toEqual(left);
  });
});
