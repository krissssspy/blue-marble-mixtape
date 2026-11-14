import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';
import { validateCommitMessage } from '../../tools/hooks/lib/validate-commit-message.mjs';

const hookPath = fileURLToPath(new URL('../../tools/hooks/commit-msg', import.meta.url));

function runHook(message: string) {
  const directory = mkdtempSync(join(tmpdir(), 'commit-msg test-'));
  try {
    const messagePath = join(directory, 'COMMIT_EDITMSG');
    writeFileSync(messagePath, message);
    const result = spawnSync(hookPath, [messagePath], { encoding: 'utf8' });
    if (result.error) throw result.error;
    return result;
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}

describe('commit-msg', () => {
  it('exits zero for a valid message file', () => {
    const { status } = runHook('Wrote test for empty catalog\n');
    expect(status).toBe(0);
  });

  it('exits non-zero with the validation reason on stderr for an invalid message file', () => {
    const message = 'Add column scan pitch mapper\n';
    const { status, stderr } = runHook(message);
    expect(status).toBeGreaterThan(0);
    expect(stderr).toContain(validateCommitMessage(message).reason);
  });
});
