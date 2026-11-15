import { describe, expect, it } from 'vitest';
import {
  createArtifactInteraction,
  interactWithArtifacts,
} from '../../src/engine/artifact-interaction.js';

const coast = { id: 'coast', x: 100, range: 22 };
const forest = { id: 'forest', x: 120, range: 22 };

describe('dismissing an artifact prompt', () => {
  it('clears the prompt on No and suppresses it through the inclusive range boundary', () => {
    const opened = interactWithArtifacts(createArtifactInteraction(), 100, [coast], []);
    const dismissed = interactWithArtifacts(opened, 100, [coast], ['no']);

    expect(dismissed).toMatchObject({ focusId: 'coast', promptId: null, listeningId: null });
    expect([...dismissed.dismissedIds]).toEqual(['coast']);
    expect(opened).toMatchObject({ focusId: 'coast', promptId: 'coast' });
    expect([...opened.dismissedIds]).toEqual([]);

    const atBoundary = interactWithArtifacts(dismissed, 122, [coast], []);
    expect(atBoundary).toMatchObject({ focusId: 'coast', promptId: null });
    expect([...atBoundary.dismissedIds]).toEqual(['coast']);

    const outside = interactWithArtifacts(atBoundary, 123, [coast], []);
    expect(outside).toMatchObject({ focusId: null, promptId: null });
    expect([...outside.dismissedIds]).toEqual([]);
    expect([...atBoundary.dismissedIds]).toEqual(['coast']);

    const returned = interactWithArtifacts(outside, 122, [coast], []);
    expect(returned).toMatchObject({ focusId: 'coast', promptId: 'coast' });
  });

  it('tracks dismissals independently while artifact ranges overlap', () => {
    const spots = [coast, forest];
    const start = interactWithArtifacts(createArtifactInteraction(), 100, spots, []);
    const coastDismissed = interactWithArtifacts(start, 100, spots, ['no']);
    const forestPrompt = interactWithArtifacts(coastDismissed, 120, spots, []);
    expect(forestPrompt).toMatchObject({ focusId: 'forest', promptId: 'forest' });
    expect([...forestPrompt.dismissedIds]).toEqual(['coast']);

    const bothDismissed = interactWithArtifacts(forestPrompt, 120, spots, ['no']);
    expect(bothDismissed).toMatchObject({ focusId: 'forest', promptId: null });
    expect(new Set(bothDismissed.dismissedIds)).toEqual(new Set(['coast', 'forest']));

    const leftForest = interactWithArtifacts(bothDismissed, 95, spots, []);
    expect(leftForest).toMatchObject({ focusId: 'coast', promptId: null });
    expect([...leftForest.dismissedIds]).toEqual(['coast']);

    const returned = interactWithArtifacts(leftForest, 113, spots, []);
    expect(returned).toMatchObject({ focusId: 'forest', promptId: 'forest' });
    expect([...returned.dismissedIds]).toEqual(['coast']);
  });
});
