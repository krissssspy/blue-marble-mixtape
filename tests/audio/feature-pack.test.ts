import { describe, expect, it } from 'vitest';
import { encodeFeaturePack } from '../../tools/ingest/lib/feature-pack.mjs';
import { decodeFeaturePack } from '../../src/audio/feature-pack.js';

const oneFrame = {
  luminance: new Uint8Array([21, 76]),
  hue: new Uint8Array([2, 182]),
  saturation: new Uint8Array([72, 99]),
  edgeMagnitude: new Uint8Array([81, 61]),
  edgeDirection: new Uint8Array([17, 252]),
};

const still = () => encodeFeaturePack({ width: 2, height: 1, frames: [oneFrame] });

describe('feature-pack decoder', () => {
  it('decodes a still into the five named planar channels from an ArrayBuffer', () => {
    const bytes = still();
    const expected = { width: 2, height: 1, frames: [oneFrame] };
    expect(decodeFeaturePack(Uint8Array.from(bytes).buffer)).toEqual(expected);
    expect(decodeFeaturePack(bytes)).toEqual(expected);
  });

  it('honors a view offset and preserves signed motion bytes in every animated frame', () => {
    const frames = [
      {
        ...oneFrame,
        motionX: new Int8Array([-128, 127]),
        motionY: new Int8Array([2, -7]),
        frameDifferenceEnergy: new Uint8Array([100, 255]),
      },
      {
        ...oneFrame,
        luminance: new Uint8Array([79, 18]),
        motionX: new Int8Array([-4, 9]),
        motionY: new Int8Array([0, -2]),
        frameDifferenceEnergy: new Uint8Array([1, 0]),
      },
    ];
    const pack = encodeFeaturePack({ width: 1, height: 2, frames });
    const buffer = new Uint8Array(pack.length + 9);
    buffer.set(pack, 4);
    expect(decodeFeaturePack(buffer.subarray(4, 4 + pack.length))).toEqual({
      width: 1,
      height: 2,
      frames,
    });
  });

  it.each([
    [0, 0],
    [1, 0],
    [2, 0],
    [3, 0],
    [4, 2],
    [5, 8],
    [6, 0],
    [8, 0],
    [10, 0],
  ])('rejects a malformed BMMF header byte at %s', (offset, value) => {
    const pack = still();
    pack[offset] = value;
    expect(() => decodeFeaturePack(pack)).toThrow(/feature pack/i);
  });

  it('rejects truncated headers, short payloads, and trailing bytes', () => {
    const pack = still();
    for (const invalid of [
      pack.subarray(0, 11),
      pack.subarray(0, -1),
      Buffer.concat([pack, pack]),
    ]) {
      expect(() => decodeFeaturePack(invalid)).toThrow(/feature pack/i);
    }
  });
});
