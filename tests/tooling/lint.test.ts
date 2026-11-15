import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';

const cwd = fileURLToPath(new URL('../../', import.meta.url));
const TEST_TIMEOUT_MS = 60_000;
const CHILD_TIMEOUT_MS = 50_000;

function runLint(args: string[] = [], input?: string) {
  const result = spawnSync('npm', ['run', 'lint', ...args], {
    cwd,
    input,
    encoding: 'utf8',
    timeout: CHILD_TIMEOUT_MS,
  });
  if (result.error) throw result.error;
  return { status: result.status, output: `${result.stdout}\n${result.stderr}` };
}

describe('npm run lint', () => {
  it(
    'passes on the repository',
    () => {
      const { status, output } = runLint();
      expect(status, output).toBe(0);
    },
    TEST_TIMEOUT_MS,
  );

  it(
    'reports an unused variable in JavaScript from stdin',
    () => {
      const { status, output } = runLint(
        ['--', '--stdin', '--stdin-filename', 'tools/lint-probe.mjs'],
        'const unused = 1;\n',
      );
      expect(status, output).toBeGreaterThan(0);
      expect(output).toMatch(/\bno-unused-vars\b/);
    },
    TEST_TIMEOUT_MS,
  );
});
