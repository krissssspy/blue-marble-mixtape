import { execFile, spawnSync } from 'node:child_process';
import { once } from 'node:events';
import { readFileSync, rmSync } from 'node:fs';
import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
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

function parsePolicy(policy: string): Map<string, string[]> {
  const directives = new Map<string, string[]>();
  for (const part of policy.split(';')) {
    const tokens = part.trim().split(/\s+/).filter(Boolean);
    const name = tokens.shift();
    if (name) {
      const key = name.toLowerCase();
      expect(directives.has(key), `duplicate ${key}`).toBe(false);
      directives.set(key, tokens);
    }
  }
  return directives;
}

function attributes(markup: string): Map<string, string> {
  return new Map(
    [...markup.matchAll(/\b([\w-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g)].map(
      ([, name, doubleQuoted, singleQuoted]) => [name.toLowerCase(), doubleQuoted ?? singleQuoted],
    ),
  );
}

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
    'builds a mountable museum with an accessible canvas and a local module entry',
    () => {
      expect(buildStatus, buildOutput).toBe(0);
      const main = html.match(/<main\b([^>]*)>([\s\S]*?)<\/main\s*>/i);
      expect(main, 'museum main element').not.toBeNull();
      const shell = attributes(main![1]);
      expect(shell.get('class')?.split(/\s+/)).toContain('museum-shell');
      expect(shell.get('data-screen')).toBe('welcome');
      expect(shell.has('data-room')).toBe(true);

      const stage = [...main![2].matchAll(/<[a-z][\w-]*\b([^>]*)>/gi)].find(([, markup]) =>
        attributes(markup).get('class')?.split(/\s+/).includes('game-stage'),
      );
      expect(stage, 'museum game stage').toBeDefined();
      const canvas = main![2].slice(stage!.index).match(/<canvas\b([^>]*)>/i);
      expect(canvas, 'native game canvas').not.toBeNull();
      expect(attributes(canvas![1]).get('aria-label')?.trim()).toMatch(/\S/);

      const scripts = [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi)].map(
        ([, markup, body]) => ({ attrs: attributes(markup), body }),
      );
      const modules = scripts.filter(({ attrs }) => attrs.get('type') === 'module');
      expect(modules).toHaveLength(1);
      const src = modules[0].attrs.get('src');
      expect(src).toMatch(/^(?:\.?\/)?assets\/[^/?#]+\.m?js$/);
      const asset = src!.replace(/^\.?\//, '');
      expect(readFileSync(join(dist, asset)).length, asset).toBeGreaterThan(0);

      for (const { attrs, body } of scripts) {
        const type = attrs.get('type')?.toLowerCase() ?? '';
        if (type === '' || type === 'module' || /(?:java|ecma)script/.test(type)) {
          expect(body.trim(), 'inline executable script').toBe('');
        }
      }
      expect(html).not.toMatch(/\son[a-z]+\s*=/i);
    },
    TEST_TIMEOUT_MS,
  );

  it(
    'copies the catalog and every referenced media file into the build byte for byte',
    () => {
      expect(buildStatus, buildOutput).toBe(0);
      const publicDir = join(cwd, 'public');
      const catalog = readFileSync(join(publicDir, 'catalog.json'));
      expect(readFileSync(join(dist, 'catalog.json')).equals(catalog), 'catalog.json').toBe(true);

      const { artifacts } = JSON.parse(catalog.toString('utf8')) as {
        artifacts: { mediaPaths: Record<string, string> }[];
      };
      expect(artifacts.length).toBeGreaterThan(0);
      for (const { mediaPaths } of artifacts) {
        const paths = Object.values(mediaPaths);
        expect(paths.length).toBeGreaterThan(0);
        for (const path of paths) {
          expect(path).toMatch(/^\/media\//);
          const file = path.slice(1);
          const built = readFileSync(join(dist, file));
          expect(built.equals(readFileSync(join(publicDir, file))), path).toBe(true);
        }
      }
    },
    TEST_TIMEOUT_MS,
  );

  it(
    'passes the smoke CLI against dist/index.html served over HTTP',
    async () => {
      expect(buildStatus, buildOutput).toBe(0);
      const host = '127.0.0.1';
      const server = createServer((_request, response) => {
        response.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
        response.end(html);
      });
      try {
        await once(server.listen(0, host), 'listening');
        const { port } = server.address() as AddressInfo;
        const smokePath = join(cwd, 'tools', 'deploy', 'smoke.mjs');
        await promisify(execFile)(process.execPath, [smokePath, `http://${host}:${port}/`], {
          cwd,
          timeout: CHILD_TIMEOUT_MS,
        });
      } finally {
        if (server.listening) {
          await promisify(server.close.bind(server))();
        }
      }
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

      const directives = parsePolicy(policy as string);

      expect(directives.get('default-src')).toEqual(["'self'"]);
      expect([...(directives.get('img-src') ?? [])].sort()).toEqual(
        ["'self'", 'https://svs.gsfc.nasa.gov'].sort(),
      );
      for (const [name, sources] of directives) {
        expect(sources.length, name).toBeGreaterThan(0);
        if (name === 'img-src' || name === 'frame-ancestors') continue;
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

  it(
    'forbids base tags, foreign form targets and framing in the content security policy',
    () => {
      expect(buildStatus, buildOutput).toBe(0);
      const raw = readFileSync(join(dist, 'staticwebapp.config.json'), 'utf8');
      const config = JSON.parse(raw) as {
        globalHeaders?: Record<string, unknown>;
      };
      const policy = config.globalHeaders?.['Content-Security-Policy'];
      expect(typeof policy, 'globalHeaders["Content-Security-Policy"] is a string').toBe('string');

      const directives = parsePolicy(policy as string);
      expect(directives.get('base-uri')).toEqual(["'self'"]);
      expect(directives.get('form-action')).toEqual(["'self'"]);
      expect(directives.get('frame-ancestors')).toEqual(["'none'"]);
    },
    TEST_TIMEOUT_MS,
  );
});
