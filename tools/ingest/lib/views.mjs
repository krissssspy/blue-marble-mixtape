function imageStem({ filename }) {
  return filename.toLowerCase().replace(/\.[^.]+$/, '');
}

function isViewImage(image) {
  const stem = imageStem(image);
  return (
    !/(?:^|[_.-])no[_.-]?preview(?:[_.-]|$)/.test(stem) &&
    (!/(?:^|[_.-])(?:colou?r[_.-]?bar|legend)(?:[_.-]|$)/.test(stem) ||
      /(?:^|[_.-])(?:w|with)[_.-]?(?:colou?r[_.-]?bar|legend)/.test(stem))
  );
}

function isPreview(image) {
  return /(?:^|[_.-])(?:thm|thumb|thumbnail|searchweb|web)$/.test(imageStem(image));
}

function viewKey(image) {
  return imageStem(image)
    .replace(/(?:[_.-])\d{2,5}x\d{2,5}(?=[_.-]|$)/g, '')
    .replace(/(?:[_.-])(?:print|thm|thumb|thumbnail|searchweb|web)$/, '');
}

export function selectViews({ mainImage, mediaGroups }) {
  const groups = mediaGroups.map(({ id: groupId, items }) => ({
    groupId,
    images: items.map((item) => item?.instance).filter((media) => media?.media_type === 'Image'),
  }));
  const mainGroup = groups.find(({ images }) => images.some(({ id }) => id === mainImage?.id));
  const views = [];
  const selectedIds = new Set();
  const selectedKeys = new Set();

  function addView(image, imageVariants, groupId) {
    views.push({ image, imageVariants, groupId });
    for (const variant of imageVariants) {
      selectedIds.add(variant.id);
      selectedKeys.add(viewKey(variant));
    }
  }

  const viewImages = (images) => images.filter((image) => isViewImage(image) && !isPreview(image));
  if (mainImage && isViewImage(mainImage)) {
    const variants = mainGroup ? viewImages(mainGroup.images) : [];
    if (!isPreview(mainImage)) {
      addView(mainImage, variants.length ? variants : [mainImage], mainGroup?.groupId ?? null);
    } else if (variants.length) {
      addView(variants[0], variants, mainGroup.groupId);
    }
  }

  for (const { groupId, images } of groups) {
    if (views.length === 3) break;
    const variants = viewImages(images);
    if (!variants.length) continue;
    if (variants.some((image) => selectedIds.has(image.id) || selectedKeys.has(viewKey(image)))) {
      continue;
    }
    addView(variants[0], variants, groupId);
  }

  if (!views.length && mainImage && isViewImage(mainImage)) {
    addView(mainImage, [mainImage], mainGroup?.groupId ?? null);
  }
  return views;
}
