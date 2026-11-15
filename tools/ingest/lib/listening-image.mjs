export function selectListeningImage({ imageVariants }) {
  let selected = null;
  let largestArea = 0;

  for (const image of imageVariants) {
    const { width, height } = image;
    if (!Number.isFinite(width) || width <= 0 || width > 3840) continue;
    if (!Number.isFinite(height) || height <= 0) continue;

    const area = width * height;
    if (area <= largestArea) continue;

    const url = URL.parse(image.url);
    if (url?.host !== 'svs.gsfc.nasa.gov' || url.username || url.password) continue;
    if (url.protocol !== 'http:' && url.protocol !== 'https:') continue;
    if (!/\.(?:jpe?g|png)$/i.test(url.pathname)) continue;

    url.protocol = 'https:';
    selected = { ...image, url: url.href };
    largestArea = area;
  }

  return selected;
}
