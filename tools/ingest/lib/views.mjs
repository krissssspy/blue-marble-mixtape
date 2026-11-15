export function selectViews({ mainImage, mediaGroups }) {
  const groups = mediaGroups.map(({ id: groupId, items }) => ({
    groupId,
    imageVariants: items
      .map((item) => item?.instance)
      .filter((media) => media?.media_type === 'Image'),
  }));
  const mainGroup = groups.find(({ imageVariants }) =>
    imageVariants.some(({ id }) => id === mainImage.id),
  );
  const mainView = {
    image: mainImage,
    imageVariants: mainGroup?.imageVariants ?? [mainImage],
    groupId: mainGroup?.groupId ?? null,
  };
  const additionalViews = groups
    .filter((group) => group !== mainGroup && group.imageVariants.length > 0)
    .slice(0, 2)
    .map((group) => ({ ...group, image: group.imageVariants[0] }));

  return [mainView, ...additionalViews];
}
