import { applyConsoleBus } from './console-bus.js';
import { createPlayer, type PlaybackSnapshot } from './player.js';
import { renderScore } from './render.js';
import type { ScoreEvent } from './score.js';

export type BrowserAudioContext = Pick<
  AudioContext,
  'sampleRate' | 'currentTime' | 'resume' | 'createBuffer' | 'createBufferSource' | 'destination'
>;

interface WorkletBackend {
  load(): Promise<void>;
  create(): AudioWorkletNode;
}

export interface BrowserPlayback {
  read(): PlaybackSnapshot;
}

interface ActivePlayback extends BrowserPlayback {
  stop(): void;
}

const starting: PlaybackSnapshot = { progress: 0, activeEvents: [] };

export function createBrowserPlayer(context: BrowserAudioContext, worklet?: WorkletBackend) {
  const clock = () => context.currentTime;
  let unlocked = false;
  let workletReady = false;
  let current: ActivePlayback | null = null;

  function playBuffer(score: readonly ScoreEvent[]): ActivePlayback {
    const pcm = applyConsoleBus(renderScore(score, context.sampleRate), {
      sampleRate: Math.min(context.sampleRate, 22050),
      bitDepth: 8,
    });
    const buffer = context.createBuffer(2, pcm.left.length, pcm.sampleRate);
    buffer.getChannelData(0).set(pcm.left);
    buffer.getChannelData(1).set(pcm.right);

    const source = context.createBufferSource();
    source.buffer = buffer;
    source.connect(context.destination);
    let connected = true;
    function disconnect(): void {
      source.onended = null;
      source.disconnect();
      connected = false;
    }
    source.onended = disconnect;
    const startedAt = clock();
    try {
      source.start(startedAt);
    } catch (error) {
      disconnect();
      throw error;
    }
    const timeline = createPlayer(score, clock, startedAt);
    return {
      read: timeline.read,
      stop() {
        timeline.stop();
        if (!connected) return;
        source.stop();
        disconnect();
      },
    };
  }

  function playWorklet(score: readonly ScoreEvent[], backend: WorkletBackend): ActivePlayback {
    const node = backend.create();
    let playback: ActivePlayback | null = null;
    let connected = false;
    function disconnect(): void {
      node.port.onmessage = null;
      node.onprocessorerror = null;
      node.port.close();
      if (connected) node.disconnect();
      connected = false;
    }
    node.port.onmessage = ({ data }: MessageEvent<{ startedAt: number } | { ended: true }>) => {
      if ('startedAt' in data) playback = createPlayer(score, clock, data.startedAt);
      else disconnect();
    };
    node.onprocessorerror = () => {
      disconnect();
      workletReady = false;
      try {
        playback = playBuffer(score);
      } catch {
        playback = createPlayer([], clock);
      }
    };
    try {
      node.connect(context.destination);
      connected = true;
      node.port.postMessage(score);
    } catch (error) {
      disconnect();
      throw error;
    }
    return {
      read: () => playback?.read() ?? starting,
      stop() {
        if (connected) disconnect();
        playback?.stop();
      },
    };
  }

  async function loadWorklet(): Promise<void> {
    if (!worklet || workletReady) return;
    try {
      await worklet.load();
      workletReady = true;
    } catch {
      workletReady = false;
    }
  }

  function stop(): void {
    current?.stop();
    current = null;
  }

  return {
    async unlock(): Promise<void> {
      await Promise.all([context.resume(), loadWorklet()]);
      unlocked = true;
    },
    play(score: readonly ScoreEvent[]): BrowserPlayback {
      if (!unlocked) throw new Error('A user gesture must unlock audio before playback.');
      stop();
      if (score.length === 0) {
        current = createPlayer(score, clock);
      } else if (worklet && workletReady) {
        try {
          current = playWorklet(score, worklet);
        } catch {
          workletReady = false;
          current = playBuffer(score);
        }
      } else {
        current = playBuffer(score);
      }
      return { read: current.read };
    },
    stop,
  };
}
