export function readGalleryCards(page) {
  return page.media_groups.flatMap(({ items }) =>
    items.map(({ type, instance }) => ({ type, id: instance.id })),
  );
}

export async function crawlGallery(loadPage) {
  const entries = [];

  async function visit(galleryId) {
    const page = await loadPage(galleryId);
    for (const { type, id } of readGalleryCards(page)) {
      if (type === 'gallery_page') {
        await visit(id);
      } else {
        entries.push({ type, id, galleryId });
      }
    }
  }

  await visit(40467);
  return entries;
}
