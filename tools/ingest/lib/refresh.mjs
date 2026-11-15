import { crawlGallery } from './svs.mjs';

export async function recordSnapshot(loadPage, retrievedOn) {
  const pages = new Map();

  async function recordPage(id) {
    const page = await loadPage(id);
    if (page?.id !== id) {
      throw new Error(`Expected SVS page ${id}, received ID ${page?.id}.`);
    }
    pages.set(id, page);
    return page;
  }

  const entries = await crawlGallery(recordPage);
  for (const { type, id, galleryId } of entries) {
    if (type !== 'details_page') continue;
    try {
      await recordPage(id);
    } catch (cause) {
      throw new Error(`Could not load SVS detail ${id} (referred by gallery ${galleryId}).`, {
        cause,
      });
    }
  }

  return { retrievedOn, pages };
}
