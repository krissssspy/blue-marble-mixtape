function sourceKey({ type, id }) {
  return `${type}:${id}`;
}

export function verifyCatalogCoverage(sources, plans) {
  const covered = new Set(plans.map(({ source }) => sourceKey(source)));
  const exclusions = [];

  for (const source of sources) {
    if (covered.has(sourceKey(source))) continue;

    const { id, type, title, mainImage } = source;
    if (id !== 1 || type !== 'link' || mainImage?.filename !== 'no_preview_web_black.png') {
      throw new Error(`No catalog artifact for SVS source ${id} (${type}).`);
    }
    exclusions.push({ id, type, title, reason: 'NASA no-preview placeholder.' });
  }

  return exclusions;
}
