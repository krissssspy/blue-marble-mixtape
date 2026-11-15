import { describe, expect, it } from 'vitest';
import { walkRoom } from '../../src/engine/room-travel.js';

function room(minX: number, maxX: number) {
  return {
    walkway: [
      { x: minX, y: 128 },
      { x: maxX, y: 128 },
    ],
  };
}

const rooms = [room(40, 200), room(24, 280), room(60, 64), room(100, 340)] as const;
const left = { left: true, right: false };
const right = { left: false, right: true };
const tick = 1 / 60;

describe('room travel', () => {
  it('walks at the usual speed before reaching either door', () => {
    const position = Object.freeze({ roomIndex: 1, x: 120 });

    expect(walkRoom(position, right, rooms, 1, 0.25)).toEqual({ roomIndex: 1, x: 144 });
    expect(walkRoom(position, left, rooms, 1, 0.25)).toEqual({ roomIndex: 1, x: 96 });
    expect(position).toEqual({ roomIndex: 1, x: 120 });
  });

  it('holds at the tutorial door until ready, then enters the first gallery', () => {
    const position = { roomIndex: 0, x: 199 };
    const blocked = walkRoom(position, right, rooms, 0.999, tick);

    expect(blocked).toEqual({ roomIndex: 0, x: 200 });
    expect(walkRoom(blocked, right, rooms, 0.999, tick)).toEqual(blocked);
    expect(walkRoom(blocked, right, rooms, 1, tick)).toEqual({ roomIndex: 1, x: 32 });
  });

  it('travels right into the next room when a step reaches the endpoint exactly', () => {
    expect(walkRoom({ roomIndex: 2, x: 63 }, right, rooms, 1, 1 / 96)).toEqual({
      roomIndex: 3,
      x: 108,
    });
  });

  it('allows rightward travel outside the tutorial regardless of its loading progress', () => {
    expect(walkRoom({ roomIndex: 2, x: 63 }, right, rooms, 0.5, tick)).toEqual({
      roomIndex: 3,
      x: 108,
    });
  });

  it('travels left into the previous room and starts inside its right door', () => {
    expect(walkRoom({ roomIndex: 1, x: 25 }, left, rooms, 1, tick)).toEqual({
      roomIndex: 0,
      x: 192,
    });
  });

  it('clamps the entry position inside a room shorter than the entry offset', () => {
    expect(walkRoom({ roomIndex: 1, x: 279 }, right, rooms, 1, tick)).toEqual({
      roomIndex: 2,
      x: 64,
    });
    expect(walkRoom({ roomIndex: 3, x: 101 }, left, rooms, 1, tick)).toEqual({
      roomIndex: 2,
      x: 60,
    });
  });

  it('stops at the first left and final right endpoints', () => {
    expect(walkRoom({ roomIndex: 0, x: 41 }, left, rooms, 1, tick)).toEqual({
      roomIndex: 0,
      x: 40,
    });
    expect(walkRoom({ roomIndex: 3, x: 339 }, right, rooms, 1, tick)).toEqual({
      roomIndex: 3,
      x: 340,
    });
  });

  it.each([
    { left: false, right: false },
    { left: true, right: true },
  ])('stays at either door when movement cancels for $left, $right', (input) => {
    for (const x of [24, 280]) {
      const position = { roomIndex: 1, x };
      expect(walkRoom(position, input, rooms, 1, tick)).toEqual(position);
    }
  });
});
