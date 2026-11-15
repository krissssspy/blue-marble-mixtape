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

export async function resolveSources(pages) {
  const entries = await crawlGallery((id) => readPage(pages, id));
  return entries.map((entry) => {
    if (entry.type === 'details_page') {
      const page = readPage(pages, entry.id);
      return {
        ...entry,
        title: page.title,
        description: page.description,
        pageType: page.page_type,
        sourceUrl: httpsUrl(page.url).href,
        releaseDate: page.release_date.slice(0, 10),
        creditLine: readCredits(page),
        mainImage: page.main_image,
        mediaGroups: page.media_groups,
      };
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
}
