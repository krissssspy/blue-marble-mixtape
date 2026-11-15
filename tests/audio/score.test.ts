import { describe, expect, it } from 'vitest';
import { validateScore } from '../../src/audio/score.js';

function goodEvent(): Record<string, unknown> {
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
  const event = goodEvent();
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
