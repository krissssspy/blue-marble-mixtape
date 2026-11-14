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
});
