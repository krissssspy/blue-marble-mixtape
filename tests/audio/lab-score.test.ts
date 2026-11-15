import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import type { FeaturePack } from '../../src/audio/feature-pack.js';
import { labScore } from '../../src/audio/lab-score.js';
import { DEFAULT_RECIPE, type Recipe } from '../../src/audio/recipe.js';
import { validateScore } from '../../src/audio/score.js';

const width = 12;
const height = 8;
const plane = (pattern: number) =>
  Uint8Array.from({ length: width * height }, (_, index) => (index * pattern + 17) % 256);
const pack: FeaturePack = {
  width,
  height,
  frames: [
    {
      luminance: plane(37),
      hue: plane(17),
      saturation: plane(31),
      edgeMagnitude: plane(23),
      edgeDirection: plane(19),
      motionX: Int8Array.from(plane(11)),
      motionY: Int8Array.from(plane(21)),
    },
  ],
};

const scanFingerprints = {
  lineSweep: '353c93d9a06bd860ea27aa167b99bb7067c965cc11eb3131692b1e72574d5a60',
  radarSweep: 'ea4088c254a6c1cb61d82814ebe5dec691f0838e8f3a54fb0f97ec470f4cefc8',
  hilbertCurve: '489df2303eedd9dac6c89ce65d6b7c2a642829ca71915dcf14f19af0ae0a03f0',
  ploughPath: '14a648f37d78aac7d7c7c7a976ba195c1414ed71e83ae0bdc85b07b0b0003619',
  spiral: '42934b17f9876de2b10e84e9c035adadcc6cf4d15a22c7d74497516364c6a318',
  streamlines: 'ef8c54b606fc5053810cca3fc850d1f5b9cbf6914a4a2e4ebc85f8219ab58948',
  hotspots: 'd0693c6d6184ca6e4c9faa769b902fbc7b1557a2a078f25b932c093f8d118b07',
} as const;
const mappingFingerprints = {
  pitchSource: {
    brightness: 'cd30c61aa2d6d9389efce323651ce8bc9f8b6aef47f7482de7f9b57e39b5384b',
    hue: 'c85172a5b5f87f0050625978fa0666e2408694b681892800adfd6f53723484f8',
    height: 'acb3b07dbd182b79cdf9164436941cdd52117ba6e2f5bd3fdf5f9cec75a73318',
    edges: '8ddcda7a9e13e43bbec7e1b840d6e14961336333129f3f76a3855460313e73cb',
    motion: 'ef2a9acafdd7bf1461b2a5bf7e6e717d97d730aea6d74d3b1e7caded5f2dd791',
  },
  loudnessSource: {
    brightness: 'acb3b07dbd182b79cdf9164436941cdd52117ba6e2f5bd3fdf5f9cec75a73318',
    saturation: '2a71ba1ecf6fb30a7d3af14993c311ac2a6d97b4a28af2f9cd2cf9e92941d54d',
    edges: 'accc2bb0f8849cd41a5fe51a1eea013ee81ab49abb622b339abf4ff5ca710425',
    motion: '9e01f4bdad8929d062c4e6e171ef123cbe342e5f6a1f72e985171cd7e34a0041',
  },
} as const;

const scans = [
  ['lineSweep', 'line'],
  ['radarSweep', 'line'],
  ['hilbertCurve', 'point'],
  ['ploughPath', 'region'],
  ['spiral', 'path'],
  ['streamlines', 'path'],
  ['hotspots', 'ring'],
] as const;

function scoreHash(recipe: Recipe) {
  const score = labScore(pack, recipe);
  const canonical = JSON.stringify(score, (_, value) =>
    typeof value === 'number' ? Number(value.toFixed(7)) : value,
  );
  return createHash('sha256').update(canonical).digest('hex');
}

describe('Lab scan playback', () => {
  it('uses a distinct valid image trajectory for each choice', () => {
    const trajectories = new Set();
    for (const [scan, kind] of scans) {
      const recipe = { ...DEFAULT_RECIPE, scan, voice: 'bell' } satisfies Recipe;
      const score = labScore(pack, recipe);
      expect(scoreHash(recipe)).toBe(scanFingerprints[scan]);
      expect(score.length, scan).toBeGreaterThan(10);
      expect(validateScore(score), scan).toEqual({ ok: true });
      expect(score.every(({ voice, location }) => voice === 'bell' && location.kind === kind)).toBe(
        true,
      );
      expect(score, scan).toEqual(labScore(pack, recipe));
      trajectories.add(JSON.stringify(score.map(({ location }) => location)));
    }
    expect(trajectories.size).toBe(scans.length);
  });

  it('maps each pitch and volume choice to its own deterministic data pattern', () => {
    const base = { ...DEFAULT_RECIPE, scan: 'hotspots' } as const;
    for (const [source, expected] of Object.entries(mappingFingerprints.pitchSource)) {
      expect(scoreHash({ ...base, pitchSource: source as Recipe['pitchSource'] })).toBe(expected);
    }
    for (const [source, expected] of Object.entries(mappingFingerprints.loudnessSource)) {
      expect(scoreHash({ ...base, loudnessSource: source as Recipe['loudnessSource'] })).toBe(
        expected,
      );
    }
  });

  it('honors feature mappings, tempo, scale, and rhythm for an alternate scan', () => {
    const base = { ...DEFAULT_RECIPE, scan: 'spiral' } as const;
    const generic = labScore(pack, base);
    const modified = labScore(pack, {
      ...base,
      tempo: 'slow',
      pitchSource: 'motion',
      loudnessSource: 'edges',
      rhythm: 'euclidean',
      scale: 'wholeTone',
    });
    expect(modified.length).toBeLessThan(generic.length);
    expect(modified[1].start).toBeGreaterThan(generic[1].start);
    expect(modified[0].pitch).not.toBe(generic[0].pitch);
    expect(modified[0].loudness).not.toBe(generic[0].loudness);
    expect(validateScore(modified)).toEqual({ ok: true });
  });
});
