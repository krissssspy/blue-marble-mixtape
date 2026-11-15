import { describe, expect, it } from 'vitest';
import { STRINGS } from '../../src/strings.js';

describe('engine copy', () => {
  it('provides the shared welcome, artifact, and loading labels', () => {
    expect(STRINGS).toMatchObject({
      welcomeTitle: 'OVERTONE',
      start: '↑ START',
      listen: 'LISTEN?\n↑ YES ↓ NO',
      close: '↓ CLOSE',
      loading: 'LOADING',
      ready: 'READY',
    });
  });

  it('keeps every label to two lines of at most 18 characters each', () => {
    for (const [name, label] of Object.entries(STRINGS)) {
      const lines = label.split('\n');
      expect(lines.length, name).toBeLessThanOrEqual(2);
      for (const line of lines) {
        expect(line.trim(), name).not.toBe('');
        expect([...line].length, name).toBeLessThanOrEqual(18);
      }
    }
  });
});
