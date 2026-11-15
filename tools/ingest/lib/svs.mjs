export function readGalleryCards(page) {
  return page.media_groups.flatMap(({ items }) =>
    items.map(({ type, instance }) => ({ type, id: instance.id })),
  );
}
