interface CatalogImage {
  readonly url: string;
  readonly width: number;
  readonly height: number;
}

export interface CatalogArtifact {
  readonly id: string;
  readonly sourceId: number;
  readonly viewGroupId: number | null;
  readonly title: string;
  readonly shortTitle: string;
  readonly pageType: string;
  readonly sourceUrl: string;
  readonly creditLine: string;
  readonly altText: string;
  readonly altSource: 'nasa' | 'authored';
  readonly room: string;
  readonly featured: boolean;
  readonly releaseDate: string;
  readonly retrievalDate: string;
  readonly displayDate: string;
  readonly originalImage: CatalogImage;
  readonly fullResolution: CatalogImage | null;
  readonly mediaPaths: {
    readonly thumbnail: string;
    readonly preview: string;
    readonly features: string;
    readonly spriteSheet?: string;
  };
}

export interface MuseumCatalog {
  readonly retrievedOn: string;
  readonly artifacts: readonly CatalogArtifact[];
  readonly excludedSources: readonly {
    readonly id: number;
    readonly type: string;
    readonly title: string;
    readonly reason: string;
  }[];
}

export interface MuseumAssets {
  readonly catalog: MuseumCatalog;
  readonly practiceArtifact: CatalogArtifact;
  readonly practiceThumbnail: Uint8Array;
}

export async function loadMuseumAssets(
  fetchCatalog: (url: string) => Promise<Response>,
  loadThumbnail: (url: string) => Promise<Uint8Array>,
  onProgress: (progress: number) => void,
): Promise<MuseumAssets> {
  onProgress(0);
  let catalog: MuseumCatalog;
  try {
    const response = await fetchCatalog('/catalog.json');
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    catalog = await response.json();
  } catch (cause) {
    throw new Error('Could not load the museum catalog.', { cause });
  }
  if (!Array.isArray(catalog?.artifacts) || catalog.artifacts.length === 0) {
    throw new Error('The museum catalog has no artifacts.');
  }
  onProgress(0.5);

  const practiceArtifact =
    catalog.artifacts.find(({ featured }) => featured) ?? catalog.artifacts[0];
  const thumbnail = practiceArtifact.mediaPaths?.thumbnail;
  if (typeof thumbnail !== 'string' || !/^\/[^/\\\s]/.test(thumbnail)) {
    throw new Error('The practice artifact requires a local thumbnail path.');
  }

  let practiceThumbnail: Uint8Array;
  try {
    practiceThumbnail = await loadThumbnail(thumbnail);
  } catch (cause) {
    throw new Error(`Could not load the practice thumbnail at ${thumbnail}.`, { cause });
  }
  onProgress(1);
  return { catalog, practiceArtifact, practiceThumbnail };
}
