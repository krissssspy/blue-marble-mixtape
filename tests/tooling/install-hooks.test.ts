import { execFileSync, spawnSync } from 'node:child_process';
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, it, expect } from 'vitest';

const env = {
  PATH: process.env.PATH,
  GIT_CONFIG_GLOBAL: '/dev/null',
  GIT_CONFIG_NOSYSTEM: '1',
};

function withRepository(test: (cwd: string) => void) {
  const cwd = mkdtempSync(join(tmpdir(), 'install-hooks-test-'));
  try {
    execFileSync('git', ['init', '--quiet', '--template=', '--initial-branch', 'main'], {
      cwd,
      env,
    });
    test(cwd);
  } finally {
    rmSync(cwd, { recursive: true, force: true });
  }
}

function installPackage(cwd: string) {
  const manifest = JSON.parse(readFileSync(new URL('../../package.json', import.meta.url), 'utf8'));
  mkdirSync(cwd, { recursive: true });
  cpSync(new URL('../../tools/hooks', import.meta.url), join(cwd, 'tools', 'hooks'), {
    recursive: true,
  });
  writeFileSync(
    join(cwd, 'package.json'),
    JSON.stringify({
      name: 'install-hooks-fixture',
      version: '1.0.0',
      private: true,
      type: manifest.type,
      scripts: { prepare: manifest.scripts?.prepare },
    }),
  );
  const result = spawnSync(
    'npm',
    ['install', '--offline', '--no-audit', '--no-fund', '--ignore-scripts=false'],
    {
      cwd,
      env: {
        ...env,
        npm_config_cache: join(cwd, '.npm-cache'),
        npm_config_userconfig: join(cwd, 'empty-user.npmrc'),
        npm_config_globalconfig: join(cwd, 'empty-global.npmrc'),
      },
      encoding: 'utf8',
      timeout: 10_000,
    },
  );
  if (result.error) throw result.error;
  expect(result.status, `${result.stdout}\n${result.stderr}`).toBe(0);
}

function hookPath(cwd: string) {
  const result = spawnSync('git', ['config', '--local', '--get', 'core.hooksPath'], {
    cwd,
    env,
    encoding: 'utf8',
  });
  if (result.error) throw result.error;
  return result.stdout.trim();
}

describe('npm install hook setup', () => {
  it('sets the local hooks path when installing in the repository', () => {
    withRepository((cwd) => {
      installPackage(cwd);
      expect(hookPath(cwd)).toBe('tools/hooks');
    });
  });

  it('preserves the containing repository hooks path when installing an archive', () => {
    withRepository((cwd) => {
      execFileSync('git', ['config', '--local', 'core.hooksPath', 'existing-hooks'], { cwd, env });
      installPackage(join(cwd, 'archive'));
      expect(hookPath(cwd)).toBe('existing-hooks');
    });
  });
});
