import type { ScoreEvent } from './score.js';

export function createScheduler(score: readonly ScoreEvent[], lookahead: number) {
  if (!Number.isFinite(lookahead) || lookahead < 0) {
    throw new RangeError('Lookahead must be a finite, nonnegative time.');
  }

  let next = 0;
  return {
    take(seconds: number): readonly ScoreEvent[] {
      const from = next;
      const until = seconds + lookahead;
      while (next < score.length && score[next].start <= until) next += 1;
      return score.slice(from, next);
    },
  };
}
