import { readFileSync } from 'node:fs';
import { describe, it, expect } from 'vitest';

describe('npm run mutation', () => {
  it('exposes the Stryker run command', () => {
    const packageJson = JSON.parse(
      readFileSync(new URL('../../package.json', import.meta.url), 'utf8'),
    );
    expect(packageJson).toMatchObject({
      scripts: { mutation: expect.stringMatching(/^stryker\s+run(?:\s|$)/) },
    });
  });

  it('uses Vitest to mutate product files and breaks below a score of 80', () => {
    const config = JSON.parse(
      readFileSync(new URL('../../stryker.config.json', import.meta.url), 'utf8'),
    );
    expect(config).toMatchObject({
      testRunner: 'vitest',
      mutate: expect.arrayContaining([
        expect.stringMatching(/^(?:\.\/)?src\/\*\*(?:\/|$)/),
        expect.stringMatching(/^(?:\.\/)?tools\/\*\*\/lib\/\*\*(?:\/|$)/),
      ]),
      thresholds: { break: 80 },
    });
  });
});
