import { mkdirSync, mkdtempSync, rmSync, truncateSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { verifySiteBudget } from '../../tools/ingest/lib/site-budget.mjs';

const maxFileBytes = 2_000_000;
const maxTotalBytes = 150_000_000;
let directory: string;

beforeEach(() => {
  directory = mkdtempSync(join(tmpdir(), 'site-budget-test-'));
});

afterEach(() => {
  rmSync(directory, { recursive: true, force: true });
});

function writeSparseFile(relativePath: string, size: number) {
  const path = join(directory, relativePath);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, '');
  truncateSync(path, size);
}

function writeBuild(rootBytes: number) {
  for (let index = 0; index < 74; index++) {
    writeSparseFile(`media/artifact-${index}/features.bin`, maxFileBytes);
  }
  writeSparseFile('index.html', rootBytes);
  writeSparseFile('other/index.html', 1_000_000);
}

describe('verifySiteBudget', () => {
  it('accepts the exact decimal byte limits and counts root and nested files once', async () => {
    writeBuild(1_000_000);

    expect(await verifySiteBudget(directory)).toMatchObject({
      files: 76,
      totalBytes: maxTotalBytes,
      largestBytes: maxFileBytes,
    });
  });

  it('identifies a nested file one byte over the individual limit', async () => {
    writeSparseFile('index.html', 100);
    writeSparseFile('media/artifact/frames.webp', maxFileBytes + 1);

    await expect(async () => verifySiteBudget(directory)).rejects.toThrow(
      /media[/\\]artifact[/\\]frames\.webp/,
    );
  });

  it('reports an aggregate one byte over the total limit even when every file fits', async () => {
    writeBuild(1_000_001);

    await expect(async () => verifySiteBudget(directory)).rejects.toThrow(/150[, _]?000[, _]?001/);
  });
});
