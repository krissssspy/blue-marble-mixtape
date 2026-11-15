import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';

const hookPath = fileURLToPath(new URL('../../tools/hooks/pre-push', import.meta.url));
const localOid = 'a'.repeat(40);
const remoteOid = 'b'.repeat(40);
const zeroOid = '0'.repeat(40);
const featureUpdate = `refs/heads/feature/museum ${localOid} refs/heads/feature/museum ${remoteOid}`;

function runHook(...updates: string[]) {
  const result = spawnSync(hookPath, ['origin', '/unused/remote.git'], {
    input: `${updates.join('\n')}\n`,
  });
  if (result.error) throw result.error;
  return result.status;
}

describe('pre-push', () => {
  it('rejects an update to remote main', () => {
    const update = `refs/heads/feature/museum ${localOid} refs/heads/main ${remoteOid}`;
    expect(runHook(update)).toBeGreaterThan(0);
  });

  it('rejects an update to remote master after an allowed update', () => {
    const update = `refs/heads/feature/rooms ${localOid} refs/heads/master ${remoteOid}`;
    expect(runHook(featureUpdate, update)).toBeGreaterThan(0);
  });

  it('rejects a deletion of a protected remote branch', () => {
    const deletion = `(delete) ${zeroOid} refs/heads/main ${remoteOid}`;
    expect(runHook(deletion)).toBeGreaterThan(0);
  });

  it('accepts a protected local branch pushed to an unprotected remote branch', () => {
    const update = `refs/heads/main ${localOid} refs/heads/feature/museum ${remoteOid}`;
    expect(runHook(update)).toBe(0);
  });

  it('accepts an update to remote feature/master', () => {
    const update = `refs/heads/feature/rooms ${localOid} refs/heads/feature/master ${remoteOid}`;
    expect(runHook(update)).toBe(0);
  });
});
