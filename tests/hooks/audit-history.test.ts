import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const auditPath = fileURLToPath(new URL('../../tools/hooks/audit-history.mjs', import.meta.url));
const ownerEmail = 'owner@example.test';
const otherEmail = 'other@example.test';
const env = {
  PATH: process.env.PATH,
  GIT_CONFIG_GLOBAL: '/dev/null',
  GIT_CONFIG_NOSYSTEM: '1',
};

describe('history audit', () => {
  let cwd: string;
  let clean: string;
  let ambiguousBase: string;
  let violations: string[];
  const range = 'main..feature/museum';

  beforeAll(() => {
    cwd = mkdtempSync(join(tmpdir(), 'audit-history test-'));
    function git(args: string[], input?: string) {
      return execFileSync('git', args, { cwd, env, input, encoding: 'utf8' }).trim();
    }

    git(['init', '--quiet', '--template=', '--initial-branch', 'main']);
    const tree = git(['mktree'], '');

    function commit(
      message: string,
      parents: string[],
      author = ownerEmail,
      committer = ownerEmail,
    ) {
      return git([
        '-c',
        'author.name=Fixture',
        '-c',
        `author.email=${author}`,
        '-c',
        'committer.name=Fixture',
        '-c',
        `committer.email=${committer}`,
        'commit-tree',
        tree,
        ...parents.flatMap((parent) => ['-p', parent]),
        '-m',
        message,
      ]);
    }

    const root = commit('Added design plan', []);
    clean = commit('Wrote test for empty catalog', [root]);
    const badMessage = commit('Added room map\n\nThis explains why.', [clean]);
    const wrongAuthor = commit('Added room music', [badMessage], otherEmail);
    const wrongCommitter = commit('Added room tones', [wrongAuthor], ownerEmail, otherEmail);
    const foreign = commit('Added floor labels', [wrongCommitter], otherEmail, otherEmail);
    const side = commit('Fixed walk speed on ramps', [clean]);
    const merge = commit('Merged room layouts', [foreign, side]);
    const otherRoot = commit('Added separate history', [], otherEmail, otherEmail);
    ambiguousBase = commit('Merged separate histories', [root, otherRoot]);
    git(['update-ref', 'refs/heads/main', root]);
    git(['update-ref', 'refs/heads/feature/museum', merge]);
    violations = [badMessage, wrongAuthor, wrongCommitter, foreign, merge];
  });

  afterAll(() => {
    if (cwd) rmSync(cwd, { recursive: true, force: true });
  });

  it('reports every violating commit in the range with reasons', async () => {
    const { auditHistory } = await import('../../tools/hooks/lib/audit-history.mjs');
    const findings = auditHistory(range, cwd);
    expect(findings.map(({ hash }) => hash).sort()).toEqual([...violations].sort());
    for (const { reasons } of findings) {
      expect(reasons).toEqual(expect.arrayContaining([expect.stringMatching(/\S/)]));
    }
  });

  it('returns no findings for a clean or empty range', async () => {
    const { auditHistory } = await import('../../tools/hooks/lib/audit-history.mjs');
    expect(auditHistory(`main..${clean}`, cwd)).toEqual([]);
    expect(auditHistory('main..main', cwd)).toEqual([]);
  });

  it('explains that a malformed range requires two dots', async () => {
    const { auditHistory } = await import('../../tools/hooks/lib/audit-history.mjs');
    expect(() => auditHistory('main..feature/museum..main', cwd)).toThrow(/two-dot commit range/i);
  });

  it('explains that the base history must have one root to identify the owner', async () => {
    const { auditHistory } = await import('../../tools/hooks/lib/audit-history.mjs');
    expect(() => auditHistory(`${ambiguousBase}..${ambiguousBase}`, cwd)).toThrow(
      /base history.*one root commit/i,
    );
  });

  it('reports violating hashes and exits non-zero, or exits zero for clean history', () => {
    function runAudit(commitRange: string) {
      const result = spawnSync(process.execPath, [auditPath, commitRange], {
        cwd,
        env,
        encoding: 'utf8',
      });
      if (result.error) throw result.error;
      return result;
    }

    const { status, stdout, stderr } = runAudit(range);
    expect(status).toBeGreaterThan(0);
    const output = `${stdout}\n${stderr}`;
    for (const hash of violations) expect(output).toContain(hash);
    expect(output).not.toContain(clean);
    expect(runAudit(`main..${clean}`).status).toBe(0);
  });
});
