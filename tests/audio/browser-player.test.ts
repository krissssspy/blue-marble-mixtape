import { describe, expect, it, vi } from 'vitest';
import { createBrowserPlayer, type BrowserAudioContext } from '../../src/audio/browser-player.js';
import type { ScoreEvent } from '../../src/audio/score.js';

const note: ScoreEvent = {
  voice: 'triangle',
  start: 0,
  duration: 0.02,
  pitch: 440,
  loudness: 0.5,
  pan: -1,
  location: { kind: 'point', x: 0.5, y: 0.5 },
};

function fakeContext() {
  function createSource() {
    return {
      buffer: null as AudioBuffer | null,
      onended: null as (() => void) | null,
      connect: vi.fn(),
      disconnect: vi.fn(),
      start: vi.fn(),
      stop: vi.fn(),
    };
  }
  const sources: ReturnType<typeof createSource>[] = [];
  const native = {
    sampleRate: 48000,
    currentTime: 7,
    destination: {},
    resume: vi.fn<() => Promise<void>>(async () => undefined),
    createBuffer: vi.fn((channels: number, length: number, sampleRate: number) => {
      const data = Array.from({ length: channels }, () => new Float32Array(length));
      return { length, sampleRate, getChannelData: (index: number) => data[index] };
    }),
    createBufferSource: vi.fn(() => {
      const next = createSource();
      sources.push(next);
      return next;
    }),
  };
  return { native, sources, context: native as unknown as BrowserAudioContext };
}

describe('browser score playback', () => {
  it('waits for an explicit gesture unlock before creating or starting a buffer', async () => {
    const { context, native } = fakeContext();
    let resume!: () => void;
    native.resume.mockImplementationOnce(
      () => new Promise<void>((complete) => (resume = complete)),
    );
    const player = createBrowserPlayer(context);
    expect(() => player.play([note])).toThrow(/gesture/i);
    expect(native.createBuffer).not.toHaveBeenCalled();
    const unlocking = player.unlock();
    expect(native.resume).toHaveBeenCalledOnce();
    expect(() => player.play([note])).toThrow(/gesture/i);
    resume();
    await unlocking;
    expect(() => player.play([note])).not.toThrow();
  });

  it('renders bounded console audio to stereo and reads active locations from the same clock', async () => {
    const { context, native, sources } = fakeContext();
    const player = createBrowserPlayer(context);
    await player.unlock();
    const playback = player.play([note]);
    expect(native.createBuffer).toHaveBeenCalledWith(2, 441, 22050);
    const source = sources[0];
    expect(source.connect).toHaveBeenCalledWith(native.destination);
    expect(source.start).toHaveBeenCalledExactlyOnceWith(7);
    const left = source.buffer!.getChannelData(0);
    const right = source.buffer!.getChannelData(1);
    expect(left.some((sample) => sample !== 0)).toBe(true);
    expect(left.every((sample) => Number.isInteger(sample * 128) && Math.abs(sample) <= 1)).toBe(
      true,
    );
    expect(right.every((sample) => sample === 0)).toBe(true);
    expect(playback.read()).toEqual({ progress: 0, activeEvents: [note] });
    native.currentTime = 7.01;
    expect(playback.read().progress).toBeCloseTo(0.5);
    player.stop();
    expect(playback.read().activeEvents).toEqual([]);
    expect(source.stop).toHaveBeenCalledOnce();
    expect(source.disconnect).toHaveBeenCalledOnce();
    player.stop();
    expect(source.stop).toHaveBeenCalledOnce();
  });

  it('can retry a rejected unlock and cleans up a failed buffer start', async () => {
    const { context, native, sources } = fakeContext();
    const player = createBrowserPlayer(context);
    const unavailable = new Error('Audio unavailable');
    native.resume.mockRejectedValueOnce(unavailable);
    await expect(player.unlock()).rejects.toThrow(unavailable);
    expect(() => player.play([note])).toThrow(/gesture/i);
    await player.unlock();

    const build = native.createBufferSource.getMockImplementation()!;
    native.createBufferSource.mockImplementationOnce(() => {
      const source = build();
      source.start.mockImplementationOnce(() => {
        throw unavailable;
      });
      return source;
    });
    expect(() => player.play([note])).toThrow(unavailable);
    expect(sources[0].disconnect).toHaveBeenCalledOnce();
    expect(sources[0].stop).not.toHaveBeenCalled();
    expect(player.play([note]).read().activeEvents).toEqual([note]);
  });

  it('replaces playing notes, handles natural completion, and can play an empty score', async () => {
    const { context, native, sources } = fakeContext();
    const player = createBrowserPlayer(context);
    await player.unlock();
    const playback = player.play([note]);
    player.play([note]);
    expect(playback.read().activeEvents).toEqual([]);
    expect(sources[0].stop).toHaveBeenCalledOnce();
    sources[1].onended!();
    expect(sources[1].disconnect).toHaveBeenCalledOnce();
    const empty = player.play([]);
    expect(empty.read()).toEqual({ progress: 1, activeEvents: [] });
    expect(native.createBufferSource).toHaveBeenCalledTimes(2);
    expect(sources[1].stop).not.toHaveBeenCalled();
  });
});
