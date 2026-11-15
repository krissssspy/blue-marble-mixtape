import { resolveAltText } from './alt-text.mjs';
import { selectListeningImage } from './listening-image.mjs';
import { assignRoom } from './rooms.mjs';
import { selectViews } from './views.mjs';

const dailyVisualizationsGallery = 40512;

/**
 * @param {Awaited<ReturnType<typeof import('./sources.mjs').resolveSources>>} sources
 * @param {string} retrievedOn
 */
export function planCatalog(sources, retrievedOn) {
  return sources.flatMap((source) =>
    selectViews(source).map((view) => {
      const image = selectListeningImage(view);
      if (!image) throw new Error(`No eligible listening image for SVS source ${source.id}.`);

      const { id: sourceId, title, pageType, sourceUrl, creditLine, releaseDate } = source;
      const namespace = source.type === 'details_page' ? 'page' : 'media';
      const id = `svs-${namespace}-${sourceId}-${view.groupId ?? 'main'}`;
      const folder = `/media/${id}`;
      const displayDate = source.galleryIds.includes(dailyVisualizationsGallery)
        ? retrievedOn
        : releaseDate;

      const artifact = {
        id,
        sourceId,
        viewGroupId: view.groupId,
        title,
        shortTitle: [...title.trim()].slice(0, 18).join('').trimEnd(),
        pageType,
        sourceUrl,
        creditLine,
        ...resolveAltText(source, view, image),
        ...assignRoom(source, view),
        releaseDate,
        retrievalDate: retrievedOn,
        displayDate,
        fullResolution: { url: image.url, width: image.width, height: image.height },
        mediaPaths: {
          preview: `${folder}/preview.webp`,
          thumbnail: `${folder}/thumbnail.png`,
          features: `${folder}/features.bin`,
        },
      };

      return { artifact, source, view, image };
    }),
  );
}
