import curatedAlt from '../authored-alt.json' with { type: 'json' };

const entities = { amp: '&', nbsp: ' ', quot: '"', apos: "'", lt: '<', gt: '>' };

function usefulText(value) {
  const text = (value ?? '')
    .replace(/<\/?(?:p|div|li|br)\b[^>]*>/gi, ' ')
    .replace(/<[^>]*>/g, '')
    .replace(/&(amp|nbsp|quot|apos|lt|gt);/g, (_, name) => entities[name])
    .replace(/\s+/g, ' ')
    .trim();
  if (/^(?:image|nasa image|no preview|n\/a)[.!]?$/i.test(text)) return '';
  return text;
}

export function resolveAltText(source, view, image) {
  const nasaText = [image, ...view.imageVariants]
    .map((variant) => usefulText(variant.alt_text))
    .find(Boolean);
  if (nasaText) return { altText: nasaText, altSource: 'nasa' };

  const group = source.mediaGroups.find(({ id }) => id === view.groupId);
  const authoredText = [
    curatedAlt[`${source.id}:${view.groupId ?? 'main'}`],
    group?.caption,
    group?.description,
    group?.title,
    source.description,
    source.title,
  ]
    .map(usefulText)
    .find(Boolean);
  if (!authoredText)
    throw new Error(`No usable alt text or description for SVS source ${source.id}.`);
  return { altText: authoredText, altSource: 'authored' };
}
