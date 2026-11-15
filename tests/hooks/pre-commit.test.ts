import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';

const hookPath = fileURLToPath(new URL('../../tools/hooks/pre-commit', import.meta.url));

function runHookOnBranch(branch: string) {
  const cwd = mkdtempSync(join(tmpdir(), 'pre-commit test-'));
  const env = {
    PATH: process.env.PATH,
    GIT_CONFIG_GLOBAL: '/dev/null',
    GIT_CONFIG_NOSYSTEM: '1',
  };
  try {
    execFileSync('git', ['init', '--quiet', '--template=', '--initial-branch', branch], {
      cwd,
      env,
    });
    const result = spawnSync(hookPath, [], { cwd, env });
    if (result.error) throw result.error;
    return result.status;
  } finally {
    rmSync(cwd, { recursive: true, force: true });
  }
}

describe('pre-commit', () => {
  it.each(['main', 'master'])('exits non-zero on branch %s', (branch) => {
    expect(runHookOnBranch(branch)).toBeGreaterThan(0);
  });

  it('exits zero on a feature branch', () => {
    expect(runHookOnBranch('feature/main')).toBe(0);
  });
});
