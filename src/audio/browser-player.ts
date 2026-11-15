import { applyConsoleBus } from './console-bus.js';
import { createPlayer, type PlaybackSnapshot } from './player.js';
import { renderScore } from './render.js';
import type { ScoreEvent } from './score.js';

export type BrowserAudioContext = Pick<
  AudioContext,
  'sampleRate' | 'currentTime' | 'resume' | 'createBuffer' | 'createBufferSource' | 'destination'
>;

export interface BrowserPlayback {
  read(): PlaybackSnapshot;
}

export function createBrowserPlayer(context: BrowserAudioContext) {
  const clock = () => context.currentTime;
  let unlocked = false;
  let current: ReturnType<typeof createPlayer> | null = null;
  let source: AudioBufferSourceNode | null = null;

  function stop(): void {
    current?.stop();
    if (source) {
      source.onended = null;
      source.stop();
      source.disconnect();
      source = null;
    }
  }

  return {
    async unlock(): Promise<void> {
      await context.resume();
      unlocked = true;
    },
    play(score: readonly ScoreEvent[]): BrowserPlayback {
      if (!unlocked) throw new Error('A user gesture must unlock audio before playback.');
      stop();
      if (score.length === 0) {
        current = createPlayer(score, clock);
        return { read: current.read };
      }

      const pcm = applyConsoleBus(renderScore(score, context.sampleRate), {
        sampleRate: Math.min(context.sampleRate, 22050),
        bitDepth: 8,
      });
      const buffer = context.createBuffer(2, pcm.left.length, pcm.sampleRate);
      buffer.getChannelData(0).set(pcm.left);
      buffer.getChannelData(1).set(pcm.right);

      const candidate = context.createBufferSource();
      candidate.buffer = buffer;
      candidate.connect(context.destination);
      candidate.onended = () => {
        if (source === candidate) {
          candidate.disconnect();
          source = null;
        }
      };
      const startedAt = clock();
      try {
        candidate.start(startedAt);
      } catch (error) {
        candidate.disconnect();
        throw error;
      }
      source = candidate;
      current = createPlayer(score, clock, startedAt);
      return { read: current.read };
    },
    stop,
  };
}
