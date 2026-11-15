import type { InputSample } from './input-buffer.js';
import { walkPosition } from './walking.js';
import type { WalkwayPoint } from './walkway.js';

interface RoomPath {
  readonly walkway: readonly WalkwayPoint[];
}

interface RoomPosition {
  readonly roomIndex: number;
  readonly x: number;
}

const entryOffset = 8;

function walkwayBounds({ walkway }: RoomPath) {
  return { minX: walkway[0].x, maxX: walkway[walkway.length - 1].x };
}

export function tutorialExitOpen(progress: number): boolean {
  return progress >= 1;
}

export function walkRoom(
  { roomIndex, x }: RoomPosition,
  input: Pick<InputSample, 'left' | 'right'>,
  rooms: readonly RoomPath[],
  tutorialProgress: number,
  dt: number,
): RoomPosition {
  const bounds = walkwayBounds(rooms[roomIndex]);
  const nextX = walkPosition(x, input, bounds, dt);

  if (
    input.right &&
    !input.left &&
    nextX === bounds.maxX &&
    roomIndex + 1 < rooms.length &&
    (roomIndex > 0 || tutorialExitOpen(tutorialProgress))
  ) {
    const { minX, maxX } = walkwayBounds(rooms[roomIndex + 1]);
    return { roomIndex: roomIndex + 1, x: Math.min(minX + entryOffset, maxX) };
  }

  if (input.left && !input.right && nextX === bounds.minX && roomIndex > 0) {
    const { minX, maxX } = walkwayBounds(rooms[roomIndex - 1]);
    return { roomIndex: roomIndex - 1, x: Math.max(minX, maxX - entryOffset) };
  }

  return { roomIndex, x: nextX };
}
