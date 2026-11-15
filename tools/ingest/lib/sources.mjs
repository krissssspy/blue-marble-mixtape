import { crawlGallery } from './svs.mjs';

function readPage(pages, id) {
  const page = pages.get(id);
  if (!page) throw new Error(`No recorded response for SVS page ${id}.`);
  return page;
}

function httpsUrl(value) {
  const url = new URL(value);
  url.protocol = 'https:';
  return url;
}

function readCredits(page) {
  const primary = Object.entries(page.main_credits);
  const credits =
    primary.length > 0 ? primary : page.credits.map(({ role, people }) => [role, people]);
  return credits
    .map(([role, people]) => `${role}: ${people.map(({ name }) => name).join(', ')}`)
    .join('; ');
}

function readMainImage(page) {
  if (page.id !== 5072 || page.main_image?.id !== 764822) return page.main_image;

  // The recorded main image was replaced by NASA's print of the same January–December view.
  const group = page.media_groups.find(({ id }) => id === 311998);
  const replacement = group?.items.find((item) => item?.instance?.id === 1206041);
  if (!replacement) throw new Error('Missing the replacement main image for SVS source 5072.');
  return replacement.instance;
}

function detailSource(entry, page) {
  return {
    ...entry,
    title: page.title,
    description: page.description,
    pageType: page.page_type,
    sourceUrl: httpsUrl(page.url).href,
    releaseDate: page.release_date.slice(0, 10),
    creditLine: readCredits(page),
    mainImage: readMainImage(page),
    mediaGroups: page.media_groups,
  };
}

export async function resolveSources(pages, supplementalViews = []) {
  const entries = await crawlGallery((id) => readPage(pages, id));
  const sources = entries.map((entry) => {
    if (entry.type === 'details_page') {
      return detailSource(entry, readPage(pages, entry.id));
    }

    const gallery = readPage(pages, entry.galleryId);
    const matchesEntry = ({ type, instance }) => type === entry.type && instance.id === entry.id;
    const group = gallery.media_groups.find(({ items }) => items.some(matchesEntry));
    const card = group.items.find(matchesEntry);
    const sourceUrl = httpsUrl(gallery.url);
    sourceUrl.hash = `media_group_${group.id}`;
    return {
      ...entry,
      title: card.title,
      description: card.caption,
      pageType: card.instance.media_type,
      sourceUrl: sourceUrl.href,
      releaseDate: gallery.release_date.slice(0, 10),
      creditLine: 'NASA Scientific Visualization Studio',
      mainImage: card.instance,
      mediaGroups: [],
    };
  });
  for (const { id, groupId } of supplementalViews) {
    if (sources.some((source) => source.type === 'details_page' && source.id === id)) {
      throw new Error(`SVS source ${id} is already in the catalog.`);
    }
    const page = readPage(pages, id);
    const group = page.media_groups.find((candidate) => candidate.id === groupId);
    if (!group) throw new Error(`SVS source ${id} has no media group ${groupId}.`);
    sources.push({
      ...detailSource({ type: 'details_page', id, galleryIds: [] }, page),
      mainImage: null,
      mediaGroups: [group],
    });
  }
  return sources;
}
