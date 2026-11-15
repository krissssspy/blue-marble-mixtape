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
  'sea-level': '604e67d22ba83ed07e5cc96459706a11ff3297a15326639f329807e21f5171b9',
  'air-quality': 'c1a9bcbe0d1dff7250934fc8887f63a7b480d5f6fae0f806299e6ac24205eb69',
  biodiversity: '5f54a399a917966260e6b0a73503a986c73955825732bb2e684af57c486a392c',
  wildfires: '3d7302d091030fdff2685ac65bd3587369fef2deec34d10a3f24fe18f38b73aa',
  'greenhouse-gases': '6e9c8e6fad3caacbc52071c43490d001700021ea45819f1b053d81d2aa8dcbe0',
  energy: '242afb2aed3b8fb3019c5a15fc5d3e66bb8449f8eab6b3b03fd9081ca943b29a',
  disasters: 'b1abf930b3b988cbb0584cce3d18b1380f86c025131aeef6f69b367d519ba806',
  'water-resources': '731d90ff999d58a067d537bb5690b23735bb8eff79c13d9220fbbe739b986c3c',
  agriculture: 'ccb24656a3fdaf122ff59d2c3b95b914fdecf0bd8fe4460a4be8974766cea87e',
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
    const plough = exhibitScore('agriculture', fixture()).filter(
      ({ voice, start }) =>
        voice === 'pluck' && Math.abs(start / 0.155 - Math.round(start / 0.155)) < 1e-6,
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
