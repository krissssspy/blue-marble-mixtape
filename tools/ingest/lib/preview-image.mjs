import sharp from 'sharp';

export function encodeListeningPreview(input) {
  return sharp(input).resize({ width: 1280, withoutEnlargement: true }).webp().toBuffer();
}
