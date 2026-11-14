import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';

const cwd = fileURLToPath(new URL('../../', import.meta.url));
const TEST_TIMEOUT_MS = 60_000;
const CHILD_TIMEOUT_MS = 50_000;

describe('npm run format:check', () => {
  it(
    'checks repository files with Prettier and exits zero',
    () => {
      const result = spawnSync('npm', ['run', 'format:check'], {
        cwd,
        encoding: 'utf8',
        timeout: CHILD_TIMEOUT_MS,
      });
      if (result.error) throw result.error;
      const output = `${result.stdout}\n${result.stderr}`;
      expect(result.status, output).toBe(0);
      expect(output).toContain('All matched files use Prettier code style!');
    },
    TEST_TIMEOUT_MS,
  );
});
