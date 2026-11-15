interface Pixel {
  readonly x: number;
  readonly y: number;
}

interface ProtectedArea extends Pixel {
  readonly width: number;
  readonly height: number;
}

interface AmbientAnimation {
  readonly intervalMs: number;
  readonly changes: readonly (readonly Pixel[])[];
}

const maxAnimations = 3;
const minIntervalMs = 1000;
const pixelLimit = 320 * 180 * 0.02;

export function assertAmbientMotion(
  animations: readonly AmbientAnimation[],
  protectedAreas: readonly ProtectedArea[],
): void {
  if (animations.length > maxAnimations) {
    throw new Error('A room may have at most three ambient animations.');
  }

  for (const [animationIndex, animation] of animations.entries()) {
    const name = `Ambient animation ${animationIndex + 1}`;
    if (animation.intervalMs < minIntervalMs) {
      throw new Error(`${name} must wait at least 1000 ms between changes.`);
    }

    for (const [changeIndex, change] of animation.changes.entries()) {
      const distinctPixels = new Set(change.map(({ x, y }) => `${x},${y}`));
      if (distinctPixels.size >= pixelLimit) {
        throw new Error(
          `${name} change ${changeIndex + 1} must touch fewer than 2% of the screen.`,
        );
      }

      for (const { x, y } of change) {
        const isProtected = protectedAreas.some(
          (area) =>
            x >= area.x && x < area.x + area.width && y >= area.y && y < area.y + area.height,
        );
        if (isProtected) {
          throw new Error(
            `${name} change ${changeIndex + 1} touches a protected area at ${x},${y}.`,
          );
        }
      }
    }
  }
}
