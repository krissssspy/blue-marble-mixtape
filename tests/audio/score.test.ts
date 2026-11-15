import { describe, expect, it } from 'vitest';
import { eventsAt, scoreDuration, validateScore, type ScoreEvent } from '../../src/audio/score.js';

function goodEvent(): ScoreEvent {
  return {
    voice: 'pulse',
    start: 0,
    duration: 0.5,
    pitch: 440,
    loudness: 0.5,
    pan: 0,
    location: { kind: 'point', x: 0.25, y: 0.75 },
  };
}

function without(field: string): unknown {
  const event: Record<string, unknown> = { ...goodEvent() };
  delete event[field];
  return event;
}

describe('validateScore', () => {
  it('accepts an empty score', () => {
    expect(validateScore([])).toEqual({ ok: true });
  });

  it('accepts well-formed events with point and region locations', () => {
    const region = {
      ...goodEvent(),
      voice: 'bell',
      location: { kind: 'region', x: 0.1, y: 0.2, width: 0.3, height: 0.4 },
    };
    expect(validateScore([goodEvent(), region])).toEqual({ ok: true });
  });

  it('rejects an event with no location and reports its index', () => {
    const result = validateScore([goodEvent(), without('location')]);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.index).toBe(1);
      expect(result.reason).toContain('location');
    }
  });

  it('rejects an event whose location is null', () => {
    const result = validateScore([goodEvent(), { ...goodEvent(), location: null }]);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.index).toBe(1);
      expect(result.reason).toContain('location');
    }
  });

  it.each(['voice', 'start', 'duration', 'pitch', 'loudness', 'pan'])(
    'rejects an event missing %s',
    (field) => {
      const result = validateScore([goodEvent(), without(field)]);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.index).toBe(1);
        expect(result.reason).toContain(field);
      }
    },
  );

  it.each([null, undefined, true, 440])('rejects a non-object event %s', (event) => {
    expect(validateScore([goodEvent(), event])).toEqual({
      ok: false,
      index: 1,
      reason: 'event must be an object',
    });
  });

  it('rejects an event with an unknown voice', () => {
    const result = validateScore([goodEvent(), { ...goodEvent(), voice: 'kazoo' }]);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.index).toBe(1);
      expect(result.reason).toContain('voice');
    }
  });
});

describe('score event values and ordering', () => {
  it.each(['start', 'duration', 'pitch', 'loudness', 'pan'])('rejects non-finite %s', (field) => {
    for (const value of [Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY]) {
      expect(validateScore([{ ...goodEvent(), [field]: value }])).toEqual({
        ok: false,
        index: 0,
        reason: expect.stringContaining(field),
      });
    }
  });

  it.each([
    ['start', -0.01],
    ['duration', 0],
    ['duration', -1],
    ['pitch', 0],
    ['pitch', -1],
    ['loudness', -0.01],
    ['loudness', 1.01],
    ['pan', -1.01],
    ['pan', 1.01],
  ])('rejects %s outside its range (%s)', (field, value) => {
    expect(validateScore([{ ...goodEvent(), [field]: value }])).toEqual({
      ok: false,
      index: 0,
      reason: expect.stringContaining(field),
    });
  });

  it('accepts simultaneous starts and both endpoints for pan and loudness', () => {
    expect(
      validateScore([
        { ...goodEvent(), pan: -1, loudness: 0 },
        { ...goodEvent(), pan: 1, loudness: 1 },
        { ...goodEvent(), start: 0.25 },
      ]),
    ).toEqual({ ok: true });
  });

  it('rejects the first event whose start precedes the previous one', () => {
    expect(
      validateScore([goodEvent(), { ...goodEvent(), start: 2 }, { ...goodEvent(), start: 1 }]),
    ).toEqual({ ok: false, index: 2, reason: expect.stringContaining('start') });
  });
});

describe('score image locations', () => {
  const from = { x: 0, y: 1 };
  const to = { x: 1, y: 0 };
  const sparse = [from, to];
  sparse.length = 3;
  const valid = [
    { kind: 'point', ...to },
    { kind: 'line', from, to },
    { kind: 'ring', center: { x: 0.5, y: 0.5 }, radius: 0.25 },
    { kind: 'path', points: [from, to] },
    { kind: 'region', x: 0, y: 0.5, width: 1, height: 0.5 },
  ];

  it('accepts all five image-relative shapes used by the playhead', () => {
    expect(validateScore(valid.map((location) => ({ ...goodEvent(), location })))).toEqual({
      ok: true,
    });
  });

  it.each([
    'point',
    { kind: 'arrow' },
    { kind: 'point', x: -0.01, y: 0.5 },
    { kind: 'point', x: 0.5, y: 1.01 },
    { kind: 'point', x: '0.5', y: 0.5 },
    { kind: 'point', x: 0.5, y: Number.NaN },
    { kind: 'line', from },
    { kind: 'line', from: { x: 0, y: -1 }, to },
    { kind: 'ring', center: from, radius: Number.POSITIVE_INFINITY },
    { kind: 'ring', center: {}, radius: 0.25 },
    { kind: 'ring', center: to, radius: -0.1 },
    { kind: 'path', points: { from, to } },
    { kind: 'path', points: [from] },
    { kind: 'path', points: sparse },
    { kind: 'path', points: [from, { x: 1, y: 2 }, to] },
    { kind: 'region', x: 0.5, y: 0, width: 1, height: 0.5 },
    { kind: 'region', x: 0, y: 0.5, width: 0.5, height: 1 },
    { kind: 'region', x: 0, y: 0, width: -0.1, height: 1 },
    { kind: 'region', x: 0, y: 0, width: 1 },
  ])('rejects a malformed image location %j', (location) => {
    expect(validateScore([goodEvent(), { ...goodEvent(), location }])).toEqual({
      ok: false,
      index: 1,
      reason: expect.stringContaining('location'),
    });
  });
});

describe('score timing', () => {
  const long = { ...goodEvent(), start: 1, duration: 3 };
  const short = { ...goodEvent(), start: 1.5, duration: 0.5 };
  const final = { ...goodEvent(), start: 3, duration: 0.25 };
  const score = [long, short, final];

  it('returns events starting at or before the clock and excludes their end boundary', () => {
    expect(eventsAt(score, 0.999)).toEqual([]);
    expect(eventsAt(score, 1)).toEqual([long]);
    expect(eventsAt(score, 1.5)).toEqual([long, short]);
    expect(eventsAt(score, 2)).toEqual([long]);
    expect(eventsAt(score, 3)).toEqual([long, final]);
    expect(eventsAt(score, 3.25)).toEqual([long]);
    expect(eventsAt(score, 4)).toEqual([]);
    expect(eventsAt([], 2)).toEqual([]);
  });

  it('uses the maximum end time, including earlier starts that outlast later events', () => {
    expect(scoreDuration([])).toBe(0);
    expect(scoreDuration([final])).toBe(3.25);
    expect(scoreDuration(score)).toBe(4);
  });
});
