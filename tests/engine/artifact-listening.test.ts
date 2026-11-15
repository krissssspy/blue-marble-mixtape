import { describe, expect, it } from 'vitest';
import {
  createArtifactInteraction,
  interactWithArtifacts,
} from '../../src/engine/artifact-interaction.js';

const spots = [
  { id: 'coast', x: 100, range: 24 },
  { id: 'forest', x: 120, range: 24 },
];
const listeningX = 119;

function showPrompt() {
  return interactWithArtifacts(createArtifactInteraction(), listeningX, spots, []);
}

function openListening() {
  return interactWithArtifacts(showPrompt(), listeningX, spots, ['yes']);
}

describe('artifact listening', () => {
  it('opens the displayed prompt on Yes, clearing the prompt without mutating it', () => {
    const prompt = showPrompt();
    expect(prompt.promptId).toBe('forest');

    const listening = interactWithArtifacts(prompt, listeningX, spots, ['yes']);
    expect(listening).toMatchObject({ promptId: null, listeningId: 'forest' });
    expect(prompt).toMatchObject({ promptId: 'forest', listeningId: null });
  });

  it('does not open a listening view before a prompt or after moving away from it', () => {
    expect(
      interactWithArtifacts(createArtifactInteraction(), listeningX, spots, ['yes']).listeningId,
    ).toBeNull();
    expect(interactWithArtifacts(showPrompt(), 200, spots, ['yes']).listeningId).toBeNull();
  });

  it.each([
    ['left', 118],
    ['right', 120],
  ] as const)('does not open a displayed prompt while moving %s', (action, explorerX) => {
    const prompt = showPrompt();
    const moving = interactWithArtifacts(prompt, explorerX, spots, [action]);

    expect(moving).toMatchObject({ promptId: 'forest', listeningId: null });
    expect([...moving.dismissedIds]).toEqual([]);
  });

  it('answers the displayed prompt when the explorer moves nearer another artifact', () => {
    const prompt = showPrompt();
    expect(prompt.promptId).toBe('forest');

    const listening = interactWithArtifacts(prompt, 100, spots, ['yes']);

    expect(listening).toMatchObject({ focusId: 'coast', promptId: null, listeningId: 'forest' });
  });

  it('opens and then closes a prompt on Yes followed by No in the same tick', () => {
    const closed = interactWithArtifacts(showPrompt(), listeningX, spots, ['yes', 'no']);

    expect(closed).toMatchObject({ focusId: 'forest', promptId: null, listeningId: null });
    expect([...closed.dismissedIds]).toEqual(['forest']);
  });

  it('dismisses a prompt without reopening it on No followed by Yes in the same tick', () => {
    const dismissed = interactWithArtifacts(showPrompt(), listeningX, spots, ['no', 'yes']);

    expect(dismissed).toMatchObject({ focusId: 'forest', promptId: null, listeningId: null });
    expect([...dismissed.dismissedIds]).toEqual(['forest']);
  });

  it.each(['left', 'right', 'yes'] as const)('stays in the listening view on %s', (action) => {
    const listening = interactWithArtifacts(openListening(), listeningX, spots, [action]);

    expect(listening).toMatchObject({ promptId: null, listeningId: 'forest' });
  });

  it('closes an existing listening view on No even after a no-op Yes in the same tick', () => {
    const closed = interactWithArtifacts(openListening(), listeningX, spots, ['yes', 'no']);

    expect(closed).toMatchObject({ focusId: 'forest', promptId: null, listeningId: null });
    expect([...closed.dismissedIds]).toEqual(['forest']);
  });

  it('does not preserve a dismissal when closing outside the artifact range', () => {
    const closed = interactWithArtifacts(openListening(), 145, spots, ['no']);

    expect(closed).toMatchObject({ focusId: null, promptId: null, listeningId: null });
    expect([...closed.dismissedIds]).toEqual([]);
    expect(interactWithArtifacts(closed, 144, spots, [])).toMatchObject({
      focusId: 'forest',
      promptId: 'forest',
    });
  });

  it('closes on No and suppresses the prompt until the explorer steps out and back in', () => {
    const listening = openListening();
    const closed = interactWithArtifacts(listening, listeningX, spots, ['no']);

    expect(closed).toMatchObject({ focusId: 'forest', promptId: null, listeningId: null });
    expect([...closed.dismissedIds]).toContain('forest');
    expect(listening.listeningId).toBe('forest');
    expect([...listening.dismissedIds]).not.toContain('forest');

    const stillHere = interactWithArtifacts(closed, 144, spots, []);
    expect(stillHere).toMatchObject({ focusId: 'forest', promptId: null, listeningId: null });
    const left = interactWithArtifacts(stillHere, 145, spots, []);
    const returned = interactWithArtifacts(left, 144, spots, []);
    expect(returned).toMatchObject({ focusId: 'forest', promptId: 'forest', listeningId: null });
  });
});
