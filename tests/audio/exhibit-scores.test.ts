import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { exhibitScore } from '../../src/audio/exhibit-scores.js';
import { decodeFeaturePack, type FeaturePack } from '../../src/audio/feature-pack.js';
import { midiToHz } from '../../src/audio/pitch.js';
import { renderScore } from '../../src/audio/render.js';
import { scoreDuration, validateScore, type ScoreEvent } from '../../src/audio/score.js';
import type { MuseumCatalog } from '../../src/engine/museum-assets.js';
import { EXHIBIT_ARTIFACT_IDS, type ExhibitId } from '../../src/exhibit-selection.js';

const exhibits = Object.keys(EXHIBIT_ARTIFACT_IDS) as ExhibitId[];
const voices = {
  'sea-level': ['pad', 'triangle'],
  'air-quality': ['noise', 'pulse'],
  biodiversity: ['bell', 'organ'],
  wildfires: ['bell', 'noise', 'pulse'],
  'greenhouse-gases': ['organ'],
  energy: ['pad', 'pulse', 'triangle'],
  disasters: ['bell', 'noise', 'pad', 'triangle'],
  'water-resources': ['bell', 'noise', 'pluck'],
  agriculture: ['noise', 'pluck', 'triangle'],
};

const scoreFingerprints = {
  'sea-level': 'ad83214669ead8e8ef551cc94ca4e7176ca812134d8e2a557b67cac6ecd99da9',
  'air-quality': '693b540c99c4ba0cc39d9a149a94f552d0af570f9ec156e278e78424ce907290',
  biodiversity: 'fc26bcbe312f9a297fba3b53e17e029627bf711599835ad0109f8aaf5d081ea2',
  wildfires: 'd6da4b8f18efc266074886860318ccf46c0dac42f3fa077812b37a37ddb89c03',
  'greenhouse-gases': 'f96f55cd85633e10d58ed06be38e538fa73e379686cf74591d92902dda5f4f3f',
  energy: '430a3ddc7b57a546d5519a3187226e7b8b444a87aface431f87ee32c0b6e8e2b',
  disasters: 'd27f9c1033d396e49700fef47632f0c6c7b068d77f6b9a5713d278c10c2e58ed',
  'water-resources': '85946f49da10a08c852c30b298b60dcdbb3b777d7471e2f2f7afe47a24055ba6',
  agriculture: 'fbcf1e009fa6b2afabc462e700f949e9b4ead76b216f714dc2dd95188fe7cec4',
};

function fixture(shift = 0): FeaturePack {
  const width = 12;
  const height = 12;
  const plane = (scale: number, frame: number) =>
    Uint8Array.from(
      { length: width * height },
      (_, index) => (scale * index + 43 * Math.floor(index / width) + frame * 17 + shift) % 256,
    );
  return {
    width,
    height,
    frames: [0, 1, 2].map((frame) => ({
      luminance: plane(13, frame),
      hue: plane(17, frame),
      saturation: plane(43, frame),
      edgeMagnitude: plane(31, frame),
      edgeDirection: plane(11, frame),
      motionX: new Int8Array(width * height).fill(frame * 19),
      motionY: new Int8Array(width * height).fill(-frame * 22),
      frameDifferenceEnergy: plane(19, frame),
    })),
  };
}

function audibleProfile(score: readonly ScoreEvent[]) {
  const sampleRate = 8000;
  const length = 256;
  const { left, right } = renderScore(score, sampleRate);
  let centroid = 0;
  for (let block = 1; block <= 6; block += 1) {
    const at = Math.floor(((left.length - length) * block) / 8);
    let power = 0;
    let weighted = 0;
    for (let bin = 1; bin <= length / 2; bin += 1) {
      const frequency = (bin * sampleRate) / length;
      const angle = (2 * Math.PI * bin) / length;
      const factor = 2 * Math.cos(angle);
      let previous = 0;
      let older = 0;
      for (let index = 0; index < length; index += 1) {
        const sample =
          (left[at + index] + right[at + index]) * Math.sin((Math.PI * index) / length) ** 2;
        const next = sample + factor * previous - older;
        older = previous;
        previous = next;
      }
      const energy = previous ** 2 + older ** 2 - factor * previous * older;
      power += energy;
      weighted += energy * frequency;
    }
    centroid += power ? weighted / power : 0;
  }
  const chroma = new Float64Array(12);
  let weight = 0;
  for (const event of score) {
    if (event.voice === 'noise') continue;
    const midi = Math.round(69 + 12 * Math.log2(event.pitch / 440));
    const contribution = event.duration * event.loudness;
    chroma[midi % 12] += contribution;
    weight += contribution;
  }
  return {
    centroid: centroid / 6,
    onsets: new Set(score.map(({ start }) => start)).size / scoreDuration(score),
    chroma: chroma.map((value) => value / weight),
  };
}

describe('nine exhibit scores', () => {
  it.each(exhibits)(
    'uses the %s instrument set and maps changing image data deterministically',
    (exhibit) => {
      const score = exhibitScore(exhibit, fixture());
      expect(score.length).toBeGreaterThan(10);
      expect(validateScore(score)).toEqual({ ok: true });
      const canonical = JSON.stringify(score, (_, value) =>
        typeof value === 'number' ? Number(value.toFixed(7)) : value,
      );
      expect(createHash('sha256').update(canonical).digest('hex')).toBe(scoreFingerprints[exhibit]);
      expect([...new Set(score.map(({ voice }) => voice))].sort()).toEqual(voices[exhibit]);
      expect(score).toEqual(exhibitScore(exhibit, fixture()));
      expect(score).not.toEqual(exhibitScore(exhibit, fixture(46)));
    },
  );

  it('maps every curated artifact to a valid score with image positions', () => {
    const { artifacts } = JSON.parse(
      readFileSync(new URL('../../public/catalog.json', import.meta.url), 'utf8'),
    ) as MuseumCatalog;
    for (const exhibit of exhibits) {
      for (const id of EXHIBIT_ARTIFACT_IDS[exhibit]) {
        const artifact = artifacts.find((candidate) => candidate.id === id)!;
        const pack = decodeFeaturePack(
          readFileSync(new URL(`../../public${artifact.mediaPaths.features}`, import.meta.url)),
        );
        const score = exhibitScore(exhibit, pack);
        expect(score.length, id).toBeGreaterThan(10);
        expect(validateScore(score), id).toEqual({ ok: true });
        for (const event of score) {
          if (event.voice === 'noise') expect(event.loudness, id).toBeLessThanOrEqual(0.12);
          else expect(event.pitch, id).toBeGreaterThanOrEqual(midiToHz(41));
        }
      }
    }
  });

  it('keeps exhibit playback audible with headroom for overlapping parts', () => {
    for (const exhibit of exhibits) {
      const { left, right } = renderScore(exhibitScore(exhibit, fixture()), 8000);
      let peak = 0;
      for (const channel of [left, right]) {
        for (const sample of channel) peak = Math.max(peak, Math.abs(sample));
      }
      expect(peak, exhibit).toBeGreaterThan(0.045);
      expect(peak, exhibit).toBeLessThanOrEqual(0.86);
    }
  });

  it('follows adjacent Hilbert cells for air quality and reverses alternate field rows', () => {
    const air = exhibitScore('air-quality', fixture()).filter(({ voice }) => voice === 'pulse');
    expect(air).toHaveLength(64);
    expect(new Set(air.map(({ location }) => JSON.stringify(location))).size).toBe(64);
    for (let index = 1; index < air.length; index += 1) {
      const a = air[index - 1].location;
      const b = air[index].location;
      if (a.kind !== 'point' || b.kind !== 'point')
        throw new Error('Expected a point per Hilbert cell.');
      expect(Math.abs(a.x - b.x) + Math.abs(a.y - b.y)).toBe(1 / 8);
    }
    const plucks = exhibitScore('agriculture', fixture()).filter(({ voice }) => voice === 'pluck');
    const stepDuration = plucks.find(
      ({ location }) => location.kind === 'region' && location.y === 0 && location.x === 1 / 8,
    )!.start;
    const plough = plucks.filter(
      ({ start }) => Math.abs(start / stepDuration - Math.round(start / stepDuration)) < 1e-6,
    );
    expect(plough.slice(0, 3).map(({ location }) => location)).toMatchObject(
      [0, 1 / 8, 2 / 8].map((x) => ({ kind: 'region', x, y: 0 })),
    );
    expect(plough.slice(8, 11).map(({ location }) => location)).toMatchObject(
      [7 / 8, 6 / 8, 5 / 8].map((x) => ({ kind: 'region', x, y: 1 / 4 })),
    );
  });

  it('produces measurably different spectra, onset rates, and pitch distributions on the same image', () => {
    const profiles = exhibits.map((exhibit) => audibleProfile(exhibitScore(exhibit, fixture())));
    for (const [index, a] of profiles.entries()) {
      for (const [other, b] of profiles.slice(index + 1).entries()) {
        const pitchDistance = a.chroma.reduce(
          (sum, value, pitch) => sum + Math.abs(value - b.chroma[pitch]),
          0,
        );
        const difference = Math.hypot(
          (a.centroid - b.centroid) / 2000,
          (a.onsets - b.onsets) / 20,
          pitchDistance / 2,
        );
        expect(difference, `${exhibits[index]} vs. ${exhibits[index + other + 1]}`).toBeGreaterThan(
          0.22,
        );
      }
    }
  });
});
