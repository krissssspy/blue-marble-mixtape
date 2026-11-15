import { describe, expect, it } from 'vitest';
import { assertRoomMotifs } from '../../src/engine/background.js';

function room(id: string, layerSizes: readonly number[]) {
  let nextMotif = 1;
  return {
    id,
    layers: layerSizes.map((count) => ({
      motifs: Array.from({ length: count }, () => `${id}-motif-${nextMotif++}`),
    })),
  };
}

describe('room background motifs', () => {
  it('accepts rooms with at least four layers and ten distinct motifs each', () => {
    expect(() =>
      assertRoomMotifs([room('coast', [3, 3, 2, 2]), room('rainforest', [2, 2, 2, 2, 2])]),
    ).not.toThrow();
  });

  it('rejects a room with enough motifs but fewer than four layers', () => {
    expect(() => assertRoomMotifs([room('coast', [4, 3, 3])])).toThrow(/coast.*four.*layers/i);
  });

  it('rejects a room when ten entries describe only nine distinct motifs', () => {
    const coast = room('coast', [3, 3, 2, 2]);
    coast.layers[3].motifs[1] = coast.layers[0].motifs[0];

    expect(() => assertRoomMotifs([coast])).toThrow(/coast.*ten distinct motifs/i);
  });

  it.each(['', '   '])('does not count %j as a named motif', (blank) => {
    const coast = room('coast', [3, 3, 2, 2]);
    coast.layers[3].motifs[1] = blank;

    expect(() => assertRoomMotifs([coast])).toThrow();
  });

  it('rejects reuse of the same motif in different rooms', () => {
    const coast = room('coast', [3, 3, 2, 2]);
    const rainforest = room('rainforest', [3, 3, 2, 2]);
    rainforest.layers[3].motifs[1] = coast.layers[0].motifs[0];

    expect(() => assertRoomMotifs([coast, rainforest])).toThrow(
      /rainforest.*reuses.*coast-motif-1/i,
    );
  });
});
