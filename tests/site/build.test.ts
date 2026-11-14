import { spawnSync } from 'node:child_process';
import { readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { beforeAll, describe, it, expect } from 'vitest';

const cwd = fileURLToPath(new URL('../../', import.meta.url));
const dist = join(cwd, 'dist');
const TEST_TIMEOUT_MS = 60_000;
const CHILD_TIMEOUT_MS = 50_000;

let buildStatus: number | null = null;
let buildOutput = '';
let html = '';

beforeAll(() => {
  rmSync(dist, { recursive: true, force: true });
  const result = spawnSync('npm', ['run', 'build'], {
    cwd,
    encoding: 'utf8',
    timeout: CHILD_TIMEOUT_MS,
  });
  if (result.error) throw result.error;
  buildStatus = result.status;
  buildOutput = `${result.stdout}\n${result.stderr}`;
  if (buildStatus === 0) html = readFileSync(join(dist, 'index.html'), 'utf8');
}, TEST_TIMEOUT_MS);

describe('npm run build', () => {
  it(
    'exits zero',
    () => {
      expect(buildStatus, buildOutput).toBe(0);
    },
    TEST_TIMEOUT_MS,
  );

  it(
    'writes an English HTML5 page titled "Blue Marble Mixtape" with a mobile viewport',
    () => {
      expect(buildStatus, buildOutput).toBe(0);
      expect(html).toMatch(/^\s*<!doctype html>/i);
      expect(html).toMatch(/<html\b[^>]*\blang=["']en["']/i);
      expect(html).toMatch(/<title>\s*Blue Marble Mixtape\s*<\/title>/);
      const viewport = html.match(/<meta\b(?=[^>]*\bname=["']viewport["'])[^>]*>/i);
      expect(viewport, 'a <meta name="viewport"> element').not.toBeNull();
      expect(viewport?.[0]).toMatch(/\bcontent=["'][^"']*width=device-width/);
      expect(viewport?.[0]).toMatch(/\bcontent=["'][^"']*initial-scale=1(?![.\d])/);
    },
    TEST_TIMEOUT_MS,
  );
});
