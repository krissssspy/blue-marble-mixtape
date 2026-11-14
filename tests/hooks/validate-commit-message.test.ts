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
    expect(result.reason?.length).toBeGreaterThan(0);
  });

  it('rejects a message with a trailer line', () => {
    const result = validateCommitMessage(
      'Added pitch mapper\n\nSigned-off-by: Someone <s@example.com>',
    );
    expect(result.ok).toBe(false);
    expect(typeof result.reason).toBe('string');
    expect(result.reason?.length).toBeGreaterThan(0);
  });

  it('accepts a message whose only extra line is whitespace', () => {
    const result = validateCommitMessage('Added pitch mapper\n   \n');
    expect(result.ok).toBe(true);
  });

  it('rejects two non-empty lines with no blank line between them', () => {
    const result = validateCommitMessage('Added pitch mapper\nMore text');
    expect(result.ok).toBe(false);
    expect(typeof result.reason).toBe('string');
    expect(result.reason?.length).toBeGreaterThan(0);
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
    expect(result.reason?.length).toBeGreaterThan(0);
  });

  it.each([
    'Built pitch mapper',
    'Wrote test for empty catalog',
    'Made ramp controls',
    'Drew room map',
    'Kept walk speed',
    'Split the catalog',
  ])('accepts a listed irregular verb in "%s"', (message) => {
    const result = validateCommitMessage(message);
    expect(result.ok).toBe(true);
  });

  it.each([
    ['a lower-case irregular first word', 'wrote test for empty catalog'],
    ['an upper-case irregular first word', 'WROTE test for empty catalog'],
    ['a first word that starts with an irregular verb', 'Builtin pitch mapper'],
    ['a wrong first word followed by an irregular verb', 'Feature: Wrote test for empty catalog'],
  ])('rejects %s', (_label, message) => {
    const result = validateCommitMessage(message);
    expect(result.ok).toBe(false);
    expect(typeof result.reason).toBe('string');
    expect(result.reason?.length).toBeGreaterThan(0);
  });

  const subjectAtLimit =
    'Added room labels and audio cues for the Blue Marble Mixtape 🌍 showcases';

  it.each([
    ['without a line ending', ''],
    ['with a CRLF line ending', '\r\n'],
  ])('accepts a 72-character subject %s', (_label, lineEnding) => {
    expect([...subjectAtLimit]).toHaveLength(72);
    const result = validateCommitMessage(`${subjectAtLimit}${lineEnding}`);
    expect(result.ok).toBe(true);
  });

  it('rejects a 73-character subject', () => {
    const subject = `${subjectAtLimit}.`;
    expect([...subject]).toHaveLength(73);
    const result = validateCommitMessage(subject);
    expect(result.ok).toBe(false);
    expect(typeof result.reason).toBe('string');
    expect(result.reason?.length).toBeGreaterThan(0);
  });

  it.each([
    'Updated citation (Co-Authored-By: Example)',
    'Removed CLAUDE from credits',
    'Updated CoDeX references',
    'Removed obsolete reference to GpT',
    'Updated CoPilot-related labels',
    'Removed (AgEnT) label',
    'Updated AssisTant labels',
    'Generated room labels',
    'Removed AnthroPIC references',
    'Updated credits for OpenAI.',
  ])('rejects a banned term in "%s"', (message) => {
    const result = validateCommitMessage(message);
    expect(result.ok).toBe(false);
    expect(typeof result.reason).toBe('string');
    expect(result.reason?.length).toBeGreaterThan(0);
  });

  it('accepts a banned term embedded in a longer word', () => {
    const result = validateCommitMessage('Updated the inventory of reagents');
    expect(result.ok).toBe(true);
  });
});
