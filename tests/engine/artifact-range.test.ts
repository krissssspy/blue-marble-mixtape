import { describe, expect, it } from 'vitest';
import {
  createArtifactInteraction,
  interactWithArtifacts,
} from '../../src/engine/artifact-interaction.js';

const coast = { id: 'coast', x: 100, range: 30 };
const forest = { id: 'forest', x: 120, range: 30 };

describe('artifact proximity', () => {
  it('focuses and prompts the nearest artifact in range', () => {
    const start = createArtifactInteraction();
    expect(start).toMatchObject({ focusId: null, promptId: null, listeningId: null });

    const moved = interactWithArtifacts(start, 117, [coast, forest], []);

    expect(moved).toMatchObject({ focusId: 'forest', promptId: 'forest', listeningId: null });
    expect(start).toMatchObject({ focusId: null, promptId: null, listeningId: null });
  });

  it('uses room order when two artifacts are equally close', () => {
    const start = createArtifactInteraction();
    expect(interactWithArtifacts(start, 110, [coast, forest], [])).toMatchObject({
      focusId: 'coast',
      promptId: 'coast',
    });
    expect(interactWithArtifacts(start, 110, [forest, coast], [])).toMatchObject({
      focusId: 'forest',
      promptId: 'forest',
    });
  });

  it.each([70, 130])('includes the exact interaction boundary at x=%i', (x) => {
    expect(interactWithArtifacts(createArtifactInteraction(), x, [coast], [])).toMatchObject({
      focusId: 'coast',
      promptId: 'coast',
    });
  });

  it('clears the focus and prompt after walking out of range or when the room is empty', () => {
    const focused = interactWithArtifacts(createArtifactInteraction(), 100, [coast], []);

    expect(interactWithArtifacts(focused, 131, [coast], [])).toMatchObject({
      focusId: null,
      promptId: null,
    });
    expect(interactWithArtifacts(focused, 100, [], [])).toMatchObject({
      focusId: null,
      promptId: null,
    });
  });
});
