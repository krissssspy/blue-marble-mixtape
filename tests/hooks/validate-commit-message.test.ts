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
});
