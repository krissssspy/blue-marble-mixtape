import sharp from 'sharp';
import colors from '../dusk-palette.json' with { type: 'json' };

const width = 48;
const height = 27;
const channels = 3;
const background = colors[0];
const palette = colors.map((hex) => Buffer.from(hex.slice(1), 'hex'));

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
