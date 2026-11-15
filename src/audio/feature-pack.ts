export interface FeatureFrame {
  readonly luminance: Uint8Array;
  readonly hue: Uint8Array;
  readonly saturation: Uint8Array;
  readonly edgeMagnitude: Uint8Array;
  readonly edgeDirection: Uint8Array;
  readonly motionX?: Int8Array;
  readonly motionY?: Int8Array;
  readonly frameDifferenceEnergy?: Uint8Array;
}

export interface FeaturePack {
  readonly width: number;
  readonly height: number;
  readonly frames: readonly FeatureFrame[];
}

const headerBytes = 12;

export function decodeFeaturePack(input: ArrayBuffer | Uint8Array): FeaturePack {
  const bytes =
    input instanceof Uint8Array
      ? new Uint8Array(input.buffer, input.byteOffset, input.byteLength)
      : new Uint8Array(input);
  if (
    bytes.length < headerBytes ||
    bytes[0] !== 0x42 ||
    bytes[1] !== 0x4d ||
    bytes[2] !== 0x4d ||
    bytes[3] !== 0x46 ||
    bytes[4] !== 1
  ) {
    throw new Error('Invalid version-one feature pack header.');
  }

  const header = new DataView(bytes.buffer, bytes.byteOffset, headerBytes);
  const width = header.getUint16(6, true);
  const height = header.getUint16(8, true);
  const frameCount = header.getUint16(10, true);
  const channels = frameCount === 1 ? 5 : 8;
  if (width === 0 || height === 0 || frameCount === 0 || bytes[5] !== channels) {
    throw new Error('Invalid feature pack dimensions or channels.');
  }

  const cells = width * height;
  if (bytes.length !== headerBytes + cells * channels * frameCount) {
    throw new Error('Feature pack payload length does not match its header.');
  }

  let offset = headerBytes;
  function plane(): Uint8Array {
    const start = offset;
    offset += cells;
    return bytes.subarray(start, offset);
  }

  function motionPlane(): Int8Array {
    const data = plane();
    return new Int8Array(data.buffer, data.byteOffset, data.byteLength);
  }

  const frames: FeatureFrame[] = [];
  for (let index = 0; index < frameCount; index += 1) {
    const still = {
      luminance: plane(),
      hue: plane(),
      saturation: plane(),
      edgeMagnitude: plane(),
      edgeDirection: plane(),
    };
    frames.push(
      frameCount === 1
        ? still
        : {
            ...still,
            motionX: motionPlane(),
            motionY: motionPlane(),
            frameDifferenceEnergy: plane(),
          },
    );
  }
  return { width, height, frames };
}
