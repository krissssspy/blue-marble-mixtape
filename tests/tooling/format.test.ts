import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';

const cwd = fileURLToPath(new URL('../../', import.meta.url));

describe('npm run format:check', () => {
  it('checks repository files with Prettier and exits zero', () => {
    const result = spawnSync('npm', ['run', 'format:check'], {
      cwd,
      encoding: 'utf8',
      timeout: 10_000,
    });
    if (result.error) throw result.error;
    const output = `${result.stdout}\n${result.stderr}`;
    expect(result.status, output).toBe(0);
    expect(output).toContain('All matched files use Prettier code style!');
  });
});
