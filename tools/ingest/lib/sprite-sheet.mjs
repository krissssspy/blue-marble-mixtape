import sharp from 'sharp';

const columns = 8;
const rows = 6;
const frameWidth = 320;
const frameHeight = 180;
const channels = 3;
const width = columns * frameWidth;
const height = rows * frameHeight;
const rowBytes = frameWidth * channels;
const frameBytes = rowBytes * frameHeight;
const maxBytes = 2_000_000;

export async function encodeSpriteSheet(frames) {
  if (frames.length !== columns * rows) throw new Error('Expected exactly 48 sprite frames.');

  const pixels = Buffer.alloc(width * height * channels);
  for (const [index, frame] of frames.entries()) {
    if (!Buffer.isBuffer(frame) || frame.length !== frameBytes) {
      throw new Error(`Expected ${frameBytes} RGB bytes for sprite frame ${index + 1}.`);
    }
    const tileX = index % columns;
    const tileY = Math.floor(index / columns);
    for (let row = 0; row < frameHeight; row += 1) {
      const firstByte = row * rowBytes;
      const offset = (tileY * frameHeight + row) * width * channels + tileX * rowBytes;
      frame.copy(pixels, offset, firstByte, firstByte + rowBytes);
    }
  }

  const sheet = await sharp(pixels, { raw: { width, height, channels } }).webp().toBuffer();
  if (sheet.length > maxBytes) {
    throw new Error(`Sprite sheet exceeds the ${maxBytes}-byte limit (${sheet.length} bytes).`);
  }
  return sheet;
}
