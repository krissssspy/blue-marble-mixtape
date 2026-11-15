import { execFile } from 'node:child_process';
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const smokePath = fileURLToPath(new URL('../../tools/deploy/smoke.mjs', import.meta.url));
const TEST_TIMEOUT_MS = 60_000;
const CHILD_TIMEOUT_MS = 50_000;

const page = (title: string) =>
  `<!doctype html><html><head><meta charset="utf-8"><title>${title}</title></head><body></body></html>`;

function respond(path: string): { status: number; body: string } {
  switch (path) {
    case '/ok':
      return { status: 200, body: page('Overtone') };
    case '/wrong-title':
      return { status: 200, body: page('Something Else') };
    case '/no-title':
      return { status: 200, body: '<!doctype html><html><head></head><body>hi</body></html>' };
    default:
      return { status: 404, body: page('Overtone') };
  }
}

function runSmoke(args: string[]): Promise<{ status: number | null; stderr: string }> {
  return new Promise((resolve, reject) => {
    const child = execFile(
      process.execPath,
      [smokePath, ...args],
      { encoding: 'utf8', timeout: CHILD_TIMEOUT_MS },
      (error, _stdout, stderr) => {
        if (error && (error.killed || typeof error.code !== 'number')) {
          reject(error);
          return;
        }
        resolve({ status: child.exitCode, stderr });
      },
    );
  });
}

describe('deploy smoke check', () => {
  let server: Server;
  let base: string;
  let closedBase: string;

  beforeAll(async () => {
    server = createServer((req, res) => {
      const { status, body } = respond(req.url ?? '/');
      res.writeHead(status, { 'content-type': 'text/html; charset=utf-8' });
      res.end(body);
    });
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;

    const spare = createServer();
    await new Promise<void>((resolve) => spare.listen(0, '127.0.0.1', resolve));
    closedBase = `http://127.0.0.1:${(spare.address() as AddressInfo).port}`;
    await new Promise<void>((resolve) => spare.close(() => resolve()));
  });

  afterAll(async () => {
    if (server) {
      server.closeAllConnections();
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });

  describe('checkPage', () => {
    it(
      'passes for a 200 page titled Overtone',
      async () => {
        const { checkPage } = await import('../../tools/deploy/lib/smoke.mjs');
        expect(await checkPage(`${base}/ok`)).toEqual({ ok: true });
      },
      TEST_TIMEOUT_MS,
    );

    it.each(['/wrong-title', '/missing', '/no-title'])(
      'fails with a reason for %s',
      async (path) => {
        const { checkPage } = await import('../../tools/deploy/lib/smoke.mjs');
        const result = await checkPage(`${base}${path}`);
        expect(result.ok).toBe(false);
        expect(typeof result.reason).toBe('string');
        expect(result.reason).toMatch(/\S/);
      },
      TEST_TIMEOUT_MS,
    );

    it(
      'resolves with a failure when nothing is listening',
      async () => {
        const { checkPage } = await import('../../tools/deploy/lib/smoke.mjs');
        const result = await checkPage(`${closedBase}/ok`);
        expect(result.ok).toBe(false);
        expect(result.reason).toMatch(/\S/);
      },
      TEST_TIMEOUT_MS,
    );
  });

  describe('entry script', () => {
    it(
      'exits 0 for a good page',
      async () => {
        const result = await runSmoke([`${base}/ok`]);
        expect(result.status, result.stderr).toBe(0);
      },
      TEST_TIMEOUT_MS,
    );

    it(
      'exits 1 with a reason on stderr for a wrong title',
      async () => {
        const { checkPage } = await import('../../tools/deploy/lib/smoke.mjs');
        const expected = await checkPage(`${base}/wrong-title`);
        const result = await runSmoke([`${base}/wrong-title`]);
        expect(result.status).toBe(1);
        expect(result.stderr).toMatch(/\S/);
        expect(expected.reason).toMatch(/\S/);
        expect(result.stderr).toContain(expected.reason);
        expect(result.stderr).not.toMatch(/Cannot find module|\n\s+at /);
      },
      TEST_TIMEOUT_MS,
    );

    it(
      'exits 1 with a usage message on stderr when no URL is given',
      async () => {
        const result = await runSmoke([]);
        expect(result.status).toBe(1);
        expect(result.stderr).toMatch(/\S/);
        expect(result.stderr).toContain('Usage');
        expect(result.stderr).not.toMatch(/Cannot find module|\n\s+at /);
      },
      TEST_TIMEOUT_MS,
    );
  });
});
