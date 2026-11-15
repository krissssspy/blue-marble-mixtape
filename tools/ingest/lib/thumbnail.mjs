import sharp from 'sharp';

const width = 48;
const height = 27;
const channels = 3;
const background = '#0b1026';
const palette = [
  '0b1026',
  '121a36',
  '16213e',
  '1c2f55',
  '24406e',
  'f4f1de',
  'ffcc33',
  'ff6b6b',
  '3fa66a',
  '2b7a4b',
  '2ec4b6',
  '9bf6ff',
  '6f82a8',
  '5a3e2b',
  'a0673a',
  'f2c79a',
].map((hex) => Buffer.from(hex, 'hex'));

export async function encodeThumbnail(input) {
  const pixels = await sharp(input)
    .pipelineColourspace('srgb')
    .flatten({ background })
    .resize(width, height, { fit: 'contain', position: 'centre', background })
    .toColourspace('srgb')
    .raw()
    .toBuffer();

  for (let offset = 0; offset < pixels.length; offset += channels) {
    let bestColor = palette[0];
    let bestDistance = Infinity;
    for (const color of palette) {
      const red = pixels[offset] - color[0];
      const green = pixels[offset + 1] - color[1];
      const blue = pixels[offset + 2] - color[2];
      const distance = red ** 2 + green ** 2 + blue ** 2;
      if (distance < bestDistance) {
        bestColor = color;
        bestDistance = distance;
      }
    }
    bestColor.copy(pixels, offset);
  }

  return sharp(pixels, { raw: { width, height, channels } }).png().toBuffer();
}
