import { describe, expect, it } from 'vitest';
import { createPlayer } from '../../src/audio/player.js';
import type { ScoreEvent } from '../../src/audio/score.js';

const opening: ScoreEvent = {
  start: 0,
  duration: 1,
  pitch: 220,
  loudness: 0.75,
  pan: 0,
  voice: 'organ',
  location: { kind: 'point', x: 0.25, y: 0.5 },
};
const ending: ScoreEvent = { ...opening, start: 1.5, duration: 2, pitch: 330 };

describe('clock-based score player', () => {
  it('calculates active events and normalized progress from the audio clock', () => {
    let now = 12;
    const player = createPlayer([opening, ending], () => now);
    expect(player.read()).toEqual({ progress: 0, activeEvents: [opening] });
    now = 11;
    expect(player.read()).toEqual({ progress: 0, activeEvents: [opening] });
    now = 13.25;
    expect(player.read()).toEqual({ progress: 1.25 / 3.5, activeEvents: [] });
    now = 13.75;
    expect(player.read()).toEqual({ progress: 0.5, activeEvents: [ending] });
    now = 15.5;
    expect(player.read()).toEqual({ progress: 1, activeEvents: [] });
    now = 100;
    expect(player.read()).toEqual({ progress: 1, activeEvents: [] });
  });

  it('clears active events and freezes progress on repeated stop', () => {
    let now = 22;
    const player = createPlayer([opening, ending], () => now);
    now = 23.75;
    expect(player.read().activeEvents).toEqual([ending]);
    player.stop();
    expect(player.read()).toEqual({ progress: 0.5, activeEvents: [] });
    now = 25;
    player.stop();
    expect(player.read()).toEqual({ progress: 0.5, activeEvents: [] });
  });

  it('treats a score with no events as already complete', () => {
    const player = createPlayer([], () => 0);
    expect(player.read()).toEqual({ progress: 1, activeEvents: [] });
    player.stop();
    expect(player.read()).toEqual({ progress: 1, activeEvents: [] });
  });
});
