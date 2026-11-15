import { describe, expect, it } from 'vitest';
import { encodeFeaturePack } from '../../tools/ingest/lib/feature-pack.mjs';

const still = {
  luminance: Uint8Array.of(1, 2),
  hue: Uint8Array.of(3, 4),
  saturation: Uint8Array.of(5, 6),
  edgeMagnitude: Uint8Array.of(7, 8),
  edgeDirection: Uint8Array.of(9, 255),
};

function animationFrame(cells: number) {
  const unsigned = new Uint8Array(cells);
  const signed = new Int8Array(cells);
  return {
    luminance: unsigned,
    hue: unsigned,
    saturation: unsigned,
    edgeMagnitude: unsigned,
    edgeDirection: unsigned,
    motionX: signed,
    motionY: signed,
    frameDifferenceEnergy: unsigned,
  };
}

describe('encodeFeaturePack', () => {
  it('writes a version-one header and five planar channels for a still', () => {
    const pack = encodeFeaturePack({ width: 2, height: 1, frames: [still] });

    expect(Buffer.isBuffer(pack)).toBe(true);
    expect(pack.toString('hex')).toBe('424d4d460105020001000100010203040506070809ff');
  });

  it('writes animated frames in order and preserves signed motion as two’s-complement bytes', () => {
    const frames = [
      {
        ...still,
        motionX: Int8Array.of(0, 0),
        motionY: Int8Array.of(0, 0),
        frameDifferenceEnergy: Uint8Array.of(0, 0),
      },
      {
        luminance: Uint8Array.of(16, 17),
        hue: Uint8Array.of(18, 19),
        saturation: Uint8Array.of(20, 21),
        edgeMagnitude: Uint8Array.of(22, 23),
        edgeDirection: Uint8Array.of(24, 25),
        motionX: Int8Array.of(-2, 1),
        motionY: Int8Array.of(2, -1),
        frameDifferenceEnergy: Uint8Array.of(31, 127),
      },
    ];
    const input = { width: 2, height: 1, frames };
    const first = encodeFeaturePack(input);

    expect(first.toString('hex')).toBe(
      [
        '424d4d460108020001000200',
        '010203040506070809ff000000000000',
        '10111213141516171819fe0102ff1f7f',
      ].join(''),
    );
    expect(encodeFeaturePack(input)).toEqual(first);
  });

  it('rejects a channel that does not contain one byte per grid cell', () => {
    const frames = [{ ...still, luminance: Uint8Array.of(1) }];

    expect(() => encodeFeaturePack({ width: 2, height: 1, frames })).toThrow(/luminance|length/i);
  });

  it('rejects a pack with no frames', () => {
    expect(() => encodeFeaturePack({ width: 2, height: 1, frames: [] })).toThrow(/frame/i);
  });

  it('rejects a dimension too large for the unsigned 16-bit header', () => {
    const width = 65_536;
    const channel = new Uint8Array(width);
    const frame = {
      luminance: channel,
      hue: channel,
      saturation: channel,
      edgeMagnitude: channel,
      edgeDirection: channel,
    };

    expect(() => encodeFeaturePack({ width, height: 1, frames: [frame] })).toThrow(
      /width|dimension|range/i,
    );
  });

  it.each([
    [0, 1],
    [2, -1],
    [2.5, 1],
    [2, 1.5],
  ])('rejects nonpositive or fractional dimensions %s×%s', (width, height) => {
    expect(() => encodeFeaturePack({ width, height, frames: [still] })).toThrow(
      'Feature pack dimensions must fit positive unsigned 16-bit values.',
    );
  });

  it('rejects a frame count beyond the unsigned 16-bit header', () => {
    const frames = Array.from({ length: 65_536 }, () => still);

    expect(() => encodeFeaturePack({ width: 2, height: 1, frames })).toThrow(
      'Feature pack frame count must fit a positive unsigned 16-bit value.',
    );
  });

  it('stores the maximum unsigned 16-bit dimension and frame count', () => {
    const limit = 65_535;
    const wide = encodeFeaturePack({ width: limit, height: 1, frames: [animationFrame(limit)] });
    const frame = animationFrame(1);
    const frames = Array.from({ length: limit }, () => frame);
    const many = encodeFeaturePack({ width: 1, height: 1, frames });

    expect(wide.readUInt16LE(6)).toBe(limit);
    expect(many.readUInt16LE(10)).toBe(limit);
  });

  it.each([
    ['hue', new Int8Array(2), 'Uint8Array'],
    ['motionX', new Uint8Array(2), 'Int8Array'],
    ['motionY', new Uint8Array(2), 'Int8Array'],
    ['frameDifferenceEnergy', new Int8Array(2), 'Uint8Array'],
  ])('rejects the wrong element type for the %s channel', (channel, plane, type) => {
    const valid = animationFrame(2);
    const frames = [valid, { ...valid, [channel]: plane }];

    expect(() => encodeFeaturePack({ width: 2, height: 1, frames })).toThrow(
      `Feature pack channel ${channel} must contain 2 ${type} elements.`,
    );
  });

  it('packs all 48 production grids within the two-megabyte limit', () => {
    const width = 96;
    const height = 54;
    const frame = animationFrame(width * height);
    const frames = Array.from({ length: 48 }, () => frame);

    expect(encodeFeaturePack({ width, height, frames })).toHaveLength(1_990_668);
  });

  it('rejects an otherwise valid pack that exceeds the byte limit', () => {
    const width = 500;
    const height = 250;
    const frame = animationFrame(width * height);

    expect(() => encodeFeaturePack({ width, height, frames: [frame, frame] })).toThrow(
      'Feature pack exceeds the 2000000-byte limit.',
    );
  });
});
