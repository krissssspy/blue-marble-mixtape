import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';

const cwd = fileURLToPath(new URL('../../', import.meta.url));

function runCheck(args: string[] = []) {
  const result = spawnSync('npm', ['run', 'check', ...args], {
    cwd,
    encoding: 'utf8',
    timeout: 10_000,
  });
  if (result.error) throw result.error;
  return { status: result.status, output: `${result.stdout}\n${result.stderr}` };
}

describe('npm run check', () => {
  it('runs lint and the formatting check and passes on the repository', () => {
    const { status, output } = runCheck();
    expect(status, output).toBe(0);
    expect(output).toMatch(/\beslint\b/);
    expect(output).toContain('All matched files use Prettier code style!');
  });

  it('fails with a TypeScript diagnostic for an ill-typed project', () => {
    const directory = mkdtempSync(join(tmpdir(), 'check-test-'));
    try {
      const project = join(directory, 'tsconfig.json');
      writeFileSync(
        project,
        JSON.stringify({ compilerOptions: { noEmit: true, types: [] }, files: ['probe.ts'] }),
      );
      writeFileSync(join(directory, 'probe.ts'), "export const roomNumber: number = 'museum';\n");
      const { status, output } = runCheck(['--', '--project', project]);
      expect(status, output).toBeGreaterThan(0);
      expect(output).toMatch(/\bTS2322\b/);
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });
});
