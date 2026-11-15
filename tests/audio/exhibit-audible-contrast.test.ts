import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';
import { exhibitScore } from '../../src/audio/exhibit-scores.js';
import { decodeFeaturePack } from '../../src/audio/feature-pack.js';
import { renderScore } from '../../src/audio/render.js';
import type { ScoreEvent } from '../../src/audio/score.js';
import type { MuseumCatalog } from '../../src/engine/museum-assets.js';
import { EXHIBIT_ARTIFACT_IDS, type ExhibitId } from '../../src/exhibit-selection.js';

const sampleRate = 11025;
const windowSize = 256;
const taper = Array.from(
  { length: windowSize },
  (_, index) => Math.sin((Math.PI * index) / windowSize) ** 2,
);
const bandEdges = [125, 250, 500, 1000, 2000, 4000, Infinity];
const bins = Array.from({ length: windowSize / 2 }, (_, index) => {
  const frequency = ((index + 1) * sampleRate) / windowSize;
  return {
    band: bandEdges.findIndex((edge) => edge >= frequency),
    coefficient: 2 * Math.cos((2 * Math.PI * (index + 1)) / windowSize),
  };
});

function normalize(values: number[]): number[] {
  const sum = values.reduce((first, second) => first + second, 0);
  return values.map((value) => value / sum);
}

function audioProfile(score: readonly ScoreEvent[]) {
  const { left, right } = renderScore(score, sampleRate);
  const spectrum = Array<number>(bandEdges.length).fill(0);
  const envelope = Array<number>(14).fill(0);
  let peak = 0;
  for (let frame = 0; frame < left.length; frame += 1) {
    const power = left[frame] ** 2 + right[frame] ** 2;
    envelope[Math.floor((frame / left.length) * envelope.length)] += power;
    peak = Math.max(peak, Math.abs(left[frame]), Math.abs(right[frame]));
  }
  for (let block = 1; block <= envelope.length; block += 1) {
    const first = Math.floor(((left.length - windowSize) * block) / (envelope.length + 1));
    const samples = taper.map(
      (weight, index) => (left[first + index] + right[first + index]) * weight,
    );
    for (const { band, coefficient } of bins) {
      let previous = 0;
      let older = 0;
      for (const sample of samples) {
        const next = sample + coefficient * previous - older;
        older = previous;
        previous = next;
      }
      spectrum[band] += Math.max(0, previous ** 2 + older ** 2 - coefficient * previous * older);
    }
  }
  const pitchClasses = Array<number>(12).fill(0);
  for (const note of score) {
    if (note.voice === 'noise') continue;
    const pitchClass = Math.round(69 + 12 * Math.log2(note.pitch / 440)) % 12;
    pitchClasses[pitchClass] += note.loudness * note.duration;
  }
  return {
    spectrum: normalize(spectrum),
    envelope: normalize(envelope),
    pitchClasses: normalize(pitchClasses),
    duration: left.length / sampleRate,
    rms: Math.sqrt(envelope.reduce((sum, power) => sum + power, 0) / (2 * left.length)),
    peak,
  };
}

function contrast(a: ReturnType<typeof audioProfile>, b: ReturnType<typeof audioProfile>): number {
  const difference = (left: number[], right: number[]) =>
    left.reduce((sum, value, index) => sum + Math.abs(value - right[index]), 0) / 2;
  return Math.hypot(
    difference(a.spectrum, b.spectrum),
    difference(a.envelope, b.envelope),
    0.45 * difference(a.pitchClasses, b.pitchClasses),
    Math.abs(Math.log(a.duration / b.duration)),
  );
}

// Regression floors for the nearest pair and median pair, respectively, on the curated catalog.
const contrastFloors: Record<ExhibitId, readonly [number, number]> = {
  'sea-level': [0.13, 0.3],
  'air-quality': [0.13, 0.35],
  biodiversity: [0.19, 0.44],
  wildfires: [0.1, 0.24],
  'greenhouse-gases': [0.1, 0.17],
  energy: [0.11, 0.41],
  disasters: [0.13, 0.35],
  'water-resources': [0.14, 0.4],
  agriculture: [0.14, 0.35],
};

const { artifacts } = JSON.parse(
  readFileSync(new URL('../../public/catalog.json', import.meta.url), 'utf8'),
) as MuseumCatalog;
const exhibits = Object.keys(EXHIBIT_ARTIFACT_IDS) as ExhibitId[];

it.each(exhibits)('keeps close-sounding artifacts distinguishable in %s', (exhibit) => {
  const profiles = EXHIBIT_ARTIFACT_IDS[exhibit].map((id) => {
    const artifact = artifacts.find((candidate) => candidate.id === id)!;
    const pack = decodeFeaturePack(
      readFileSync(new URL(`../../public${artifact.mediaPaths.features}`, import.meta.url)),
    );
    const profile = audioProfile(exhibitScore(exhibit, pack));
    expect(profile.rms, id).toBeGreaterThan(0.009);
    expect(profile.peak, id).toBeLessThanOrEqual(0.85);
    return { id, profile };
  });
  const pairs = profiles
    .flatMap((first, index) =>
      profiles.slice(index + 1).map((second) => ({
        first: first.id,
        second: second.id,
        contrast: contrast(first.profile, second.profile),
      })),
    )
    .sort((first, second) => first.contrast - second.contrast);
  const [closest, typical] = contrastFloors[exhibit];
  expect(pairs[0].contrast, `${pairs[0].first} and ${pairs[0].second}`).toBeGreaterThan(closest);
  expect(pairs[Math.floor(pairs.length / 2)].contrast).toBeGreaterThan(typical);
});
