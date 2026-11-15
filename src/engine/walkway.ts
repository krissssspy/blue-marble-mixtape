export interface WalkwayPoint {
  readonly x: number;
  readonly y: number;
}

/** Expects at least one point in ascending x order. Duplicate x coordinates are allowed. */
export function walkwayHeight(points: readonly WalkwayPoint[], x: number): number {
  if (x < points[0].x) return points[0].y;

  for (let i = 1; i < points.length; i += 1) {
    const right = points[i];
    if (x < right.x) {
      const left = points[i - 1];
      const fraction = (x - left.x) / (right.x - left.x);
      return left.y + (right.y - left.y) * fraction;
    }
  }

  return points[points.length - 1].y;
}
