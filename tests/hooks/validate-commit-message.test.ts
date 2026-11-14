import { describe, it, expect } from 'vitest';
import { validateCommitMessage } from '../../tools/hooks/lib/validate-commit-message.mjs';

describe('validateCommitMessage', () => {
  it('accepts a one-line message that starts with a capitalised past-tense verb', () => {
    const result = validateCommitMessage('Added column scan pitch mapper');
    expect(result.ok).toBe(true);
  });

  it('accepts a valid message that ends with the trailing newline git appends', () => {
    const result = validateCommitMessage('Fixed walk speed on ramps\n');
    expect(result.ok).toBe(true);
  });

  it('accepts a one-word subject that is a past-tense verb', () => {
    const result = validateCommitMessage('Refactored');
    expect(result.ok).toBe(true);
  });

  it('rejects a message with a subject, a blank line and a body', () => {
    const result = validateCommitMessage('Added pitch mapper\n\nThis explains why.');
    expect(result.ok).toBe(false);
    expect(typeof result.reason).toBe('string');
    expect(result.reason.length).toBeGreaterThan(0);
  });

  it('rejects a message with a trailer line', () => {
    const result = validateCommitMessage(
      'Added pitch mapper\n\nSigned-off-by: Someone <s@example.com>',
    );
    expect(result.ok).toBe(false);
    expect(typeof result.reason).toBe('string');
    expect(result.reason.length).toBeGreaterThan(0);
  });

  it('accepts a message whose only extra line is whitespace', () => {
    const result = validateCommitMessage('Added pitch mapper\n   \n');
    expect(result.ok).toBe(true);
  });

  it('rejects two non-empty lines with no blank line between them', () => {
    const result = validateCommitMessage('Added pitch mapper\nMore text');
    expect(result.ok).toBe(false);
    expect(typeof result.reason).toBe('string');
    expect(result.reason.length).toBeGreaterThan(0);
  });

  it.each([
    ['an imperative first word', 'Add pitch mapper'],
    ['a present-tense first word', 'Adds pitch mapper'],
    ['a lower-case first word', 'added pitch mapper'],
    ['a first word that is not a verb in the past tense', 'Feature pitch mapper'],
    ['a wrong first word followed by a later past-tense word', 'Feature: Added pitch mapper'],
    ['a first word that only contains "ed"', 'Needless pitch mapper'],
    ['a three-letter first word that ends in "ed"', 'Red pitch mapper'],
  ])('rejects %s', (_label, message) => {
    const result = validateCommitMessage(message);
    expect(result.ok).toBe(false);
    expect(typeof result.reason).toBe('string');
    expect(result.reason.length).toBeGreaterThan(0);
  });
});
