import { DUSK_PALETTE } from './engine/palette.js';

const width = 48;
const height = 27;
const palette = new Map(
  DUSK_PALETTE.map((hex, index) => [Number.parseInt(hex.slice(1), 16), index]),
);

export async function loadMuseumThumbnail(document: Document, path: string): Promise<Uint8Array> {
  const image = document.createElement('img');
  image.src = path;
  await image.decode();

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Could not decode the exhibit thumbnail.');
  context.imageSmoothingEnabled = false;
  context.drawImage(image, 0, 0, width, height);

  const { data } = context.getImageData(0, 0, width, height);
  return Uint8Array.from({ length: width * height }, (_, pixel) => {
    const offset = pixel * 4;
    const rgb = (data[offset] << 16) | (data[offset + 1] << 8) | data[offset + 2];
    return palette.get(rgb) ?? 0;
  });
}
