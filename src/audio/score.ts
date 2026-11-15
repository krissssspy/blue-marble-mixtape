export const VOICE_NAMES = ['pulse', 'triangle', 'noise', 'pluck', 'organ', 'bell', 'pad'] as const;
export type VoiceName = (typeof VOICE_NAMES)[number];

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

const NUMBER_FIELDS = {
  start: (value: number) => value >= 0,
  duration: (value: number) => value > 0,
  pitch: (value: number) => value > 0,
  loudness: (value: number) => value >= 0 && value <= 1,
  pan: (value: number) => value >= -1 && value <= 1,
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object';
}

function isCoordinate(value: unknown): value is number {
  return typeof value === 'number' && value >= 0 && value <= 1;
}

function isImagePoint(value: unknown): value is ImagePoint {
  return isRecord(value) && isCoordinate(value.x) && isCoordinate(value.y);
}

function isScoreLocation(value: unknown): boolean {
  if (!isRecord(value)) return false;

  switch (value.kind) {
    case 'point':
      return isImagePoint(value);
    case 'line':
      return isImagePoint(value.from) && isImagePoint(value.to);
    case 'ring':
      return isImagePoint(value.center) && isCoordinate(value.radius);
    case 'path':
      return (
        Array.isArray(value.points) &&
        value.points.length >= 2 &&
        Array.from(value.points).every(isImagePoint)
      );
    case 'region': {
      const { width, height } = value;
      return (
        isImagePoint(value) &&
        isCoordinate(width) &&
        isCoordinate(height) &&
        value.x + width <= 1 &&
        value.y + height <= 1
      );
    }
    default:
      return false;
  }
}

function eventProblem(event: unknown): string | undefined {
  if (!isRecord(event)) return 'event must be an object';
  if (!VOICE_NAMES.some((voice) => voice === event.voice)) {
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
  if (!isScoreLocation(event.location)) return 'location is malformed';
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

export function eventsAt(score: readonly ScoreEvent[], seconds: number): readonly ScoreEvent[] {
  return score.filter(({ start, duration }) => seconds >= start && seconds < start + duration);
}

export function scoreDuration(score: readonly ScoreEvent[]): number {
  return score.reduce((latest, { start, duration }) => Math.max(latest, start + duration), 0);
}
