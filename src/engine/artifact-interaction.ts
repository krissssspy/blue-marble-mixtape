import type { MuseumAction } from './input-map.js';

export interface ArtifactSpot {
  readonly id: string;
  readonly x: number;
  readonly range: number;
}

export interface ArtifactInteraction {
  readonly focusId: string | null;
  readonly promptId: string | null;
  readonly listeningId: string | null;
}

export function createArtifactInteraction(): ArtifactInteraction {
  return { focusId: null, promptId: null, listeningId: null };
}

function closestArtifact(explorerX: number, spots: readonly ArtifactSpot[]): string | null {
  let closestDistance = Infinity;
  let closestId: string | null = null;
  for (const { id, x } of spots) {
    const distance = Math.abs(explorerX - x);
    if (distance < closestDistance) {
      closestDistance = distance;
      closestId = id;
    }
  }
  return closestId;
}

export function interactWithArtifacts(
  state: ArtifactInteraction,
  explorerX: number,
  spots: readonly ArtifactSpot[],
  pressed: readonly MuseumAction[],
): ArtifactInteraction;
export function interactWithArtifacts(
  state: ArtifactInteraction,
  explorerX: number,
  spots: readonly ArtifactSpot[],
): ArtifactInteraction {
  const inRange = spots.filter(({ x, range }) => Math.abs(explorerX - x) <= range);
  const focusId = closestArtifact(explorerX, inRange);
  return { ...state, focusId, promptId: focusId };
}
