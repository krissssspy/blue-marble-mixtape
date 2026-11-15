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

  it(
    'writes dist/staticwebapp.config.json with a navigation fallback to /index.html',
    () => {
      expect(buildStatus, buildOutput).toBe(0);
      const raw = readFileSync(join(dist, 'staticwebapp.config.json'), 'utf8');
      const config = JSON.parse(raw) as { navigationFallback?: { rewrite?: unknown } };
      expect(config.navigationFallback?.rewrite).toBe('/index.html');
    },
    TEST_TIMEOUT_MS,
  );

  it(
    'sends a content security policy that allows only the site itself and NASA images',
    () => {
      expect(buildStatus, buildOutput).toBe(0);
      const raw = readFileSync(join(dist, 'staticwebapp.config.json'), 'utf8');
      const config = JSON.parse(raw) as {
        globalHeaders?: Record<string, unknown>;
      };
      const policy = config.globalHeaders?.['Content-Security-Policy'];
      expect(typeof policy, 'globalHeaders["Content-Security-Policy"] is a string').toBe('string');
      expect((policy as string).trim().length).toBeGreaterThan(0);

      const directives = new Map<string, string[]>();
      for (const part of (policy as string).split(';')) {
        const tokens = part.trim().split(/\s+/).filter(Boolean);
        const name = tokens.shift();
        if (name) {
          const key = name.toLowerCase();
          expect(directives.has(key), `duplicate ${key}`).toBe(false);
          directives.set(key, tokens);
        }
      }

      expect(directives.get('default-src')).toEqual(["'self'"]);
      expect([...(directives.get('img-src') ?? [])].sort()).toEqual(
        ["'self'", 'https://svs.gsfc.nasa.gov'].sort(),
      );
      for (const [name, sources] of directives) {
        expect(sources.length, name).toBeGreaterThan(0);
        if (name === 'img-src') continue;
        for (const source of sources) {
          expect(["'self'"], `${name} source ${source}`).toContain(source);
        }
      }
      for (const name of ['script-src', 'style-src', 'media-src']) {
        const effective = directives.get(name) ?? directives.get('default-src');
        expect(effective, name).toEqual(["'self'"]);
      }

      const everySource = [...directives.values()].flat();
      for (const source of everySource) {
        expect(source, 'no wildcard').not.toContain('*');
        expect(source.toLowerCase()).not.toBe("'unsafe-inline'");
        expect(source.toLowerCase()).not.toBe("'unsafe-eval'");
        expect(source.toLowerCase()).not.toMatch(/^(data|blob|http):/);
        if (/^[a-z][a-z0-9+.-]*:/i.test(source) || source.includes('.')) {
          expect(source, 'off-site host').toBe('https://svs.gsfc.nasa.gov');
        }
      }
    },
    TEST_TIMEOUT_MS,
  );
});
