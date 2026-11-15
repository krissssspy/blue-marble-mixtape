import { describe, expect, it } from 'vitest';
import { mapKey } from '../../src/engine/input-map.js';

describe('mapKey', () => {
  it.each([
    ['ArrowLeft', 'left'],
    ['ArrowRight', 'right'],
    ['ArrowUp', 'yes'],
    ['ArrowDown', 'no'],
  ])('maps %s to %s', (key, action) => {
    expect(mapKey(key)).toBe(action);
  });

  it.each([
    'y',
    'n',
    ' ',
    'Enter',
    'Escape',
    'Left',
    'arrowLeft',
    'Arrowup',
    'ARROWDOWN',
    'constructor',
    'toString',
  ])('ignores %j', (key) => {
    expect(mapKey(key)).toBeUndefined();
  });
});
