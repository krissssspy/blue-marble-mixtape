const stillChannels = ['luminance', 'hue', 'saturation', 'edgeMagnitude', 'edgeDirection'];
const animatedChannels = [...stillChannels, 'motionX', 'motionY', 'frameDifferenceEnergy'];
const headerBytes = 12;
const maxUint16 = 0xffff;
const maxBytes = 2_000_000;

export function encodeFeaturePack({ width, height, frames }) {
  for (const dimension of [width, height]) {
    if (!Number.isInteger(dimension) || dimension < 1 || dimension > maxUint16) {
      throw new Error('Feature pack dimensions must fit positive unsigned 16-bit values.');
    }
  }
  if (!frames.length || frames.length > maxUint16) {
    throw new Error('Feature pack frame count must fit a positive unsigned 16-bit value.');
  }

  const channels = frames.length === 1 ? stillChannels : animatedChannels;
  const cells = width * height;
  const size = headerBytes + frames.length * channels.length * cells;
  if (size > maxBytes) throw new Error(`Feature pack exceeds the ${maxBytes}-byte limit.`);

  for (const frame of frames) {
    for (const channel of channels) {
      const ArrayType = channel === 'motionX' || channel === 'motionY' ? Int8Array : Uint8Array;
      const plane = frame[channel];
      if (!(plane instanceof ArrayType) || plane.length !== cells) {
        throw new Error(
          `Feature pack channel ${channel} must contain ${cells} ${ArrayType.name} elements.`,
        );
      }
    }
  }

  // BMMF, version, channel count, then LE width, height and frame count.
  const pack = Buffer.alloc(size);
  pack.write('BMMF', 0, 'ascii');
  pack[4] = 1;
  pack[5] = channels.length;
  pack.writeUInt16LE(width, 6);
  pack.writeUInt16LE(height, 8);
  pack.writeUInt16LE(frames.length, 10);

  let offset = headerBytes;
  for (const frame of frames) {
    for (const channel of channels) {
      // Buffer.set preserves the two’s-complement representation of signed motion bytes.
      pack.set(frame[channel], offset);
      offset += cells;
    }
  }
  return pack;
}
