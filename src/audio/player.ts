import { eventsAt, scoreDuration, type ScoreEvent } from './score.js';

export interface PlaybackSnapshot {
  readonly progress: number;
  readonly activeEvents: readonly ScoreEvent[];
}

export function createPlayer(score: readonly ScoreEvent[], clock: () => number) {
  const startedAt = clock();
  const duration = scoreDuration(score);
  let stoppedProgress: number | null = null;

  const elapsed = () => Math.max(0, clock() - startedAt);
  const progress = (seconds: number) => (duration === 0 ? 1 : Math.min(1, seconds / duration));

  return {
    read(): PlaybackSnapshot {
      if (stoppedProgress !== null) return { progress: stoppedProgress, activeEvents: [] };
      const seconds = elapsed();
      return { progress: progress(seconds), activeEvents: eventsAt(score, seconds) };
    },
    stop(): void {
      stoppedProgress ??= progress(elapsed());
    },
  };
}
