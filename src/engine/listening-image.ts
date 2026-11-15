interface ListeningImageArtifact {
  readonly altText: string;
  readonly mediaPaths: { readonly preview: string };
}

export function createListeningImage(
  document: Document,
  artifact: ListeningImageArtifact,
): HTMLImageElement {
  const image = document.createElement('img');
  image.alt = artifact.altText;
  image.style.width = '100%';
  image.style.height = '100%';
  image.style.objectFit = 'contain';
  image.style.imageRendering = 'auto';
  image.src = artifact.mediaPaths.preview;
  return image;
}
