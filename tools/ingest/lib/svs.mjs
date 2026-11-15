export function readGalleryCards(page) {
  return page.media_groups.flatMap(({ items }) =>
    items.map(({ type, instance }) => ({ type, id: instance.id })),
  );
}

export async function crawlGallery(loadPage) {
  const entries = new Map();
  const visitedGalleries = new Set();

  async function visit(galleryId, parentId) {
    if (visitedGalleries.has(galleryId)) return;
    visitedGalleries.add(galleryId);

    let page;
    try {
      page = await loadPage(galleryId);
    } catch (cause) {
      const context = parentId === undefined ? 'EIC root' : `child of gallery ${parentId}`;
      throw new Error(`Could not load SVS gallery ${galleryId} (${context}).`, { cause });
    }
    for (const { type, id } of readGalleryCards(page)) {
      if (type === 'gallery_page') {
        await visit(id, galleryId);
        continue;
      }

      const key = `${type === 'details_page' ? 'page' : 'media'}:${id}`;
      const entry = entries.get(key);
      if (!entry) {
        entries.set(key, { type, id, galleryId, galleryIds: [galleryId] });
      } else if (!entry.galleryIds.includes(galleryId)) {
        entry.galleryIds.push(galleryId);
      }
    }
  }

  await visit(40467);
  return [...entries.values()];
}
