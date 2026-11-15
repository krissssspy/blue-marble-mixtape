import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';
import { applyConsoleBus } from '../../src/audio/console-bus.js';
import { exhibitScore } from '../../src/audio/exhibit-scores.js';
import { decodeFeaturePack } from '../../src/audio/feature-pack.js';
import { renderScore } from '../../src/audio/render.js';
import { scoreDuration, type ScoreEvent } from '../../src/audio/score.js';
import type { MuseumCatalog } from '../../src/engine/museum-assets.js';
import { EXHIBIT_ARTIFACT_IDS, type ExhibitId } from '../../src/exhibit-selection.js';

function normalize(values: number[]): number[] {
  const sum = values.reduce((first, second) => first + second, 0);
  return values.map((value) => value / sum);
}

function scoreProfile(score: readonly ScoreEvent[]) {
  const duration = scoreDuration(score);
  const register = Array<number>(8).fill(0);
  const envelope = Array<number>(12).fill(0);
  const pitchClasses = Array<number>(12).fill(0);
  for (const { start, duration: length, voice, pitch, loudness } of score) {
    const power = loudness ** 2;
    const binWidth = duration / envelope.length;
    for (let bin = 0; bin < envelope.length; bin += 1) {
      const overlap =
        Math.min(start + length, (bin + 1) * binWidth) - Math.max(start, bin * binWidth);
      envelope[bin] += Math.max(overlap, 0) * power;
    }
    if (voice === 'noise') continue;
    const midi = Math.round(69 + 12 * Math.log2(pitch / 440));
    const octave = Math.min(register.length - 1, Math.floor(midi / 12));
    register[octave] += length * power;
    pitchClasses[midi % 12] += length * power;
  }
  return {
    register: normalize(register),
    envelope: normalize(envelope),
    pitchClasses: normalize(pitchClasses),
    duration,
  };
}

function contrast(a: ReturnType<typeof scoreProfile>, b: ReturnType<typeof scoreProfile>): number {
  const difference = (left: number[], right: number[]) =>
    left.reduce((sum, value, index) => sum + Math.abs(value - right[index]), 0) / 2;
  return Math.hypot(
    difference(a.register, b.register),
    difference(a.envelope, b.envelope),
    0.45 * difference(a.pitchClasses, b.pitchClasses),
    Math.abs(Math.log(a.duration / b.duration)),
  );
}

// Nearest-pair and median-pair floors for the score profiles on the curated catalog.
const contrastFloors: Record<ExhibitId, readonly [number, number]> = {
  'sea-level': [0.12, 0.34],
  'air-quality': [0.12, 0.43],
  biodiversity: [0.175, 0.49],
  wildfires: [0.08, 0.21],
  'greenhouse-gases': [0.07, 0.28],
  energy: [0.105, 0.72],
  disasters: [0.1, 0.4],
  'water-resources': [0.065, 0.51],
  agriculture: [0.18, 0.38],
};

const { artifacts } = JSON.parse(
  readFileSync(new URL('../../public/catalog.json', import.meta.url), 'utf8'),
) as MuseumCatalog;
const exhibits = Object.keys(EXHIBIT_ARTIFACT_IDS) as ExhibitId[];

function artifactScore(exhibit: ExhibitId, id: string) {
  const artifact = artifacts.find((candidate) => candidate.id === id)!;
  const pack = decodeFeaturePack(
    readFileSync(new URL(`../../public${artifact.mediaPaths.features}`, import.meta.url)),
  );
  return exhibitScore(exhibit, pack);
}

it.each(exhibits)('keeps close-sounding artifacts distinguishable in %s', (exhibit) => {
  const profiles = EXHIBIT_ARTIFACT_IDS[exhibit].map((id) => ({
    id,
    profile: scoreProfile(artifactScore(exhibit, id)),
  }));
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

it('separates the former closest Greenhouse Gases pair in the rendered organ audio', () => {
  const sampleRate = 11025;
  const brightness = ['svs-page-5119-312138', 'svs-page-5196-376844'].map((id) => {
    const pcm = renderScore(artifactScore('greenhouse-gases', id), sampleRate);
    const { left, right } = applyConsoleBus(pcm, { sampleRate, bitDepth: 8 });
    let power = 0;
    let differencePower = 0;
    let previous = 0;
    for (let index = 0; index < left.length; index += 1) {
      const sample = (left[index] + right[index]) / 2;
      power += sample ** 2;
      differencePower += (sample - previous) ** 2;
      previous = sample;
    }
    // Adjacent-sample differences weight higher frequencies more than lower ones.
    return Math.sqrt(differencePower / power);
  });
  expect(Math.abs(brightness[0] - brightness[1])).toBeGreaterThan(0.04);
});
