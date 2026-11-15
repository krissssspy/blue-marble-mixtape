export interface Envelope {
  readonly attack: number;
  readonly release: number;
}

export function envelope(
  elapsed: number,
  duration: number,
  { attack, release }: Envelope,
  loudness: number,
): number {
  if (elapsed <= 0 || elapsed >= duration) return 0;
  return loudness * Math.min(1, elapsed / attack, (duration - elapsed) / release);
}
