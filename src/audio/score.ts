export type VoiceName = 'pulse' | 'triangle' | 'noise' | 'pluck' | 'organ' | 'bell' | 'pad';

export interface ImagePoint {
  readonly x: number;
  readonly y: number;
}

export type ScoreLocation =
  | (ImagePoint & { readonly kind: 'point' })
  | { readonly kind: 'line'; readonly from: ImagePoint; readonly to: ImagePoint }
  | { readonly kind: 'ring'; readonly center: ImagePoint; readonly radius: number }
  | { readonly kind: 'path'; readonly points: readonly ImagePoint[] }
  | {
      readonly kind: 'region';
      readonly x: number;
      readonly y: number;
      readonly width: number;
      readonly height: number;
    };

export interface ScoreEvent {
  readonly voice: VoiceName;
  readonly start: number;
  readonly duration: number;
  readonly pitch: number;
  readonly loudness: number;
  readonly pan: number;
  readonly location: ScoreLocation;
}

export type ScoreCheck =
  { readonly ok: true } | { readonly ok: false; readonly index: number; readonly reason: string };

const VOICES: readonly string[] = ['pulse', 'triangle', 'noise', 'pluck', 'organ', 'bell', 'pad'];
const NUMBER_FIELDS = {
  start: (value: number) => value >= 0,
  duration: (value: number) => value > 0,
  pitch: (value: number) => value > 0,
  loudness: (value: number) => value >= 0 && value <= 1,
  pan: (value: number) => value >= -1 && value <= 1,
};

function eventProblem(candidate: unknown): string | undefined {
  if (candidate === null || typeof candidate !== 'object') {
    return 'event must be an object';
  }
  const event = candidate as Record<string, unknown>;
  if (typeof event.voice !== 'string' || !VOICES.includes(event.voice)) {
    return 'voice is missing or not a known voice';
  }
  for (const [field, withinRange] of Object.entries(NUMBER_FIELDS)) {
    const value = event[field];
    if (typeof value !== 'number') return `${field} is missing`;
    if (!Number.isFinite(value) || !withinRange(value)) return `${field} is outside its range`;
  }
  if (event.location === undefined || event.location === null) {
    return 'location is missing';
  }
  return undefined;
}

export function validateScore(score: readonly unknown[]): ScoreCheck {
  let previousStart = 0;
  for (let index = 0; index < score.length; index += 1) {
    const event = score[index];
    const reason = eventProblem(event);
    if (reason !== undefined) {
      return { ok: false, index, reason };
    }
    const { start } = event as ScoreEvent;
    if (start < previousStart) {
      return { ok: false, index, reason: 'start precedes the previous event' };
    }
    previousStart = start;
  }
  return { ok: true };
}
