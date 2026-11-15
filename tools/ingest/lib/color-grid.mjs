import sharp from 'sharp';

const width = 96;
const height = 54;

export async function extractColorGrid(input) {
  const pixels = await sharp(input)
    .pipelineColourspace('srgb')
    .flatten({ background: '#0b1026' })
    .resize(width, height, { fit: 'fill' })
    .toColourspace('srgb')
    .raw()
    .toBuffer();

  const luminance = new Uint8Array(width * height);
  const hue = new Uint8Array(width * height);
  const saturation = new Uint8Array(width * height);

  for (let cell = 0; cell < luminance.length; cell += 1) {
    const offset = cell * 3;
    const red = pixels[offset];
    const green = pixels[offset + 1];
    const blue = pixels[offset + 2];
    luminance[cell] = Math.round(0.2126 * red + 0.7152 * green + 0.0722 * blue);

    const max = Math.max(red, green, blue);
    const delta = max - Math.min(red, green, blue);
    if (delta === 0) continue;

    let sector;
    if (max === red) sector = (green - blue) / delta;
    else if (max === green) sector = (blue - red) / delta + 2;
    else sector = (red - green) / delta + 4;

    hue[cell] = Math.round((((sector + 6) % 6) * 255) / 6);
    saturation[cell] = Math.round((delta * 255) / max);
  }

  return { width, height, luminance, hue, saturation };
}
