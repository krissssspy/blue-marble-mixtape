import { mkdir, mkdtemp, rename, rm, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { format } from 'prettier';
import { planCatalog } from './catalog.mjs';
import { extractColorGrid } from './color-grid.mjs';
import { verifyCatalogCoverage } from './completeness.mjs';
import { encodeFeaturePack } from './feature-pack.mjs';
import { verifyListeningImage } from './image-dimensions.mjs';
import { estimateMotion } from './motion.mjs';
import { sampleViewFrames } from './movie-frames.mjs';
import { encodeListeningPreview } from './preview-image.mjs';
import { extractSobel } from './sobel.mjs';
import { encodeSpriteSheet } from './sprite-sheet.mjs';
import { encodeThumbnail } from './thumbnail.mjs';

async function fetchListeningImage(url) {
  const response = await fetch(url, { signal: AbortSignal.timeout(30_000) });
  if (!response.ok) throw new Error(`SVS returned HTTP ${response.status} for ${url}.`);
  return Buffer.from(await response.arrayBuffer());
}

async function buildFeatures(poster, samples) {
  const frames = [];
  if (samples) {
    let previous;
    for (const sample of samples) {
      const grid = await extractColorGrid(sample, {
        raw: { width: 320, height: 180, channels: 3 },
      });
      const motion = estimateMotion(grid, previous ?? grid.luminance, grid.luminance);
      frames.push({ ...grid, ...extractSobel(grid), ...motion });
      previous = grid.luminance;
    }
  } else {
    const grid = await extractColorGrid(poster);
    frames.push({ ...grid, ...extractSobel(grid) });
  }

  const { width, height } = frames[0];
  return encodeFeaturePack({ width, height, frames });
}

async function publishCatalog(staging, outputDir) {
  await mkdir(outputDir, { recursive: true });
  const media = join(outputDir, 'media');
  const oldMedia = join(staging, 'old-media');
  let backedUp = false;
  try {
    await rename(media, oldMedia);
    backedUp = true;
  } catch (cause) {
    if (cause.code !== 'ENOENT') throw cause;
  }

  let installed = false;
  try {
    await rename(join(staging, 'media'), media);
    installed = true;
    await rename(join(staging, 'catalog.json'), join(outputDir, 'catalog.json'));
  } catch (cause) {
    if (installed) await rm(media, { recursive: true, force: true });
    if (backedUp) await rename(oldMedia, media);
    throw cause;
  }
}

export async function buildCatalog(
  sources,
  retrievedOn,
  outputDir,
  { fetchImage = fetchListeningImage, sampleFrames = sampleViewFrames } = {},
) {
  const plans = planCatalog(sources, retrievedOn);
  const excludedSources = verifyCatalogCoverage(sources, plans);
  const artifacts = [];
  const destination = resolve(outputDir);
  await mkdir(dirname(destination), { recursive: true });
  const staging = await mkdtemp(join(dirname(destination), '.catalog-'));

  try {
    await mkdir(join(staging, 'media'));
    for (const { artifact, source, view, image } of plans) {
      const folder = join(staging, 'media', artifact.id);
      const bytes = await fetchImage(image.url);
      const verified = await verifyListeningImage(image, bytes);
      const samples = artifact.featured
        ? await sampleFrames(source, view, { featured: true })
        : null;
      const mediaPaths = { ...artifact.mediaPaths };

      await mkdir(folder);
      await writeFile(join(folder, 'preview.webp'), await encodeListeningPreview(bytes));
      await writeFile(join(folder, 'thumbnail.png'), await encodeThumbnail(bytes));
      if (samples) {
        await writeFile(join(folder, 'frames.webp'), await encodeSpriteSheet(samples));
        mediaPaths.spriteSheet = `/media/${artifact.id}/frames.webp`;
      }
      await writeFile(join(folder, 'features.bin'), await buildFeatures(bytes, samples));
      artifacts.push({ ...artifact, ...verified, mediaPaths });
    }

    const catalog = { retrievedOn, artifacts, excludedSources };
    const json = await format(JSON.stringify(catalog), { parser: 'json', printWidth: 100 });
    await writeFile(join(staging, 'catalog.json'), json);
    await publishCatalog(staging, destination);
    return catalog;
  } finally {
    await rm(staging, { recursive: true, force: true });
  }
}
