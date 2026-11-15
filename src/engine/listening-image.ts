interface ListeningImageArtifact {
  readonly altText: string;
  readonly mediaPaths: { readonly preview: string };
  readonly fullResolution: {
    readonly url: string;
    readonly width: number;
    readonly height: number;
  } | null;
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
  const preview = artifact.mediaPaths.preview;
  image.src = preview;

  if (artifact.fullResolution) {
    const { url } = artifact.fullResolution;
    const preload = document.createElement('img');
    preload.addEventListener(
      'load',
      () => {
        image.addEventListener(
          'error',
          () => {
            image.src = preview;
          },
          { once: true },
        );
        image.src = url;
      },
      { once: true },
    );
    preload.src = url;
  }
  return image;
}
