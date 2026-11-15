import sharp from 'sharp';

export async function verifyListeningImage(image, bytes) {
  const { format, width, height } = await sharp(bytes).metadata();
  if (format !== 'jpeg' && format !== 'png') {
    throw new Error(`Expected a JPEG or PNG listening image, received ${format}.`);
  }

  const originalImage = { url: image.url, width, height };
  const fullResolution = width <= 3840 ? originalImage : null;
  return { originalImage, fullResolution };
}
