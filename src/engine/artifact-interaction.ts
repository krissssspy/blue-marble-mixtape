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
  readonly dismissedIds: ReadonlySet<string>;
}

export function createArtifactInteraction(): ArtifactInteraction {
  return { focusId: null, promptId: null, listeningId: null, dismissedIds: new Set() };
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
): ArtifactInteraction {
  const inRange = spots.filter(({ x, range }) => Math.abs(explorerX - x) <= range);
  const focusId = closestArtifact(explorerX, inRange);
  const inRangeIds = new Set(inRange.map(({ id }) => id));
  const dismissedIds = new Set([...state.dismissedIds].filter((id) => inRangeIds.has(id)));
  if (pressed.includes('no') && state.promptId !== null && inRangeIds.has(state.promptId)) {
    dismissedIds.add(state.promptId);
  }
  const promptId = focusId !== null && !dismissedIds.has(focusId) ? focusId : null;
  return { ...state, focusId, promptId, dismissedIds };
}
