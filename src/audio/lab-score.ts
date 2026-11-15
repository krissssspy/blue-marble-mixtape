import type { FeaturePack } from './feature-pack.js';
import { cell, hilbertCell, point, unit } from './image-features.js';
import { lineSweepScore } from './line-sweep.js';
import { midiToHz } from './pitch.js';
import { RECIPE_TEMPO_BPM, type Recipe } from './recipe.js';
import { euclideanRhythm } from './rhythm.js';
import { scaleNote } from './scale.js';
import type { ImagePoint, ScoreEvent, ScoreLocation } from './score.js';

interface SampleLocation {
  readonly at: ImagePoint;
  readonly location: ScoreLocation;
}

function scanLocations(
  pack: FeaturePack,
  scan: Exclude<Recipe['scan'], 'lineSweep'>,
): SampleLocation[] {
  switch (scan) {
    case 'radarSweep': {
      const center = point(0.5, 0.5);
      return Array.from({ length: 48 }, (_, index) => {
        const angle = (2 * Math.PI * index) / 48;
        const at = point(0.5 + 0.48 * Math.cos(angle), 0.5 + 0.48 * Math.sin(angle));
        return { at, location: { kind: 'line', from: center, to: at } };
      });
    }
    case 'hilbertCurve':
      return Array.from({ length: 64 }, (_, index) => {
        const at = hilbertCell(index);
        return { at, location: { kind: 'point', ...at } };
      });
    case 'ploughPath':
      return Array.from({ length: 48 }, (_, index) => {
        const row = Math.floor(index / 8);
        const column = index % 8;
        const x = (row % 2 === 0 ? column : 7 - column) / 8;
        const y = row / 6;
        const at = point(x + 1 / 16, y + 1 / 12);
        return { at, location: { kind: 'region', x, y, width: 1 / 8, height: 1 / 6 } };
      });
    case 'spiral': {
      let previous = point(0.5, 0.5);
      return Array.from({ length: 48 }, (_, index) => {
        const turn = index / 47;
        const angle = turn * 8 * Math.PI;
        const radius = 0.04 + turn * 0.43;
        const at = point(0.5 + radius * Math.cos(angle), 0.5 + radius * Math.sin(angle));
        const location = { kind: 'path', points: [previous, at] } as const;
        previous = at;
        return { at, location };
      });
    }
    case 'streamlines':
      return Array.from({ length: 4 }, (_, stream) => {
        let previous = point(0.09, (stream + 0.5) / 4);
        return Array.from({ length: 12 }, (_, index) => {
          const source = cell(pack, previous, index);
          const at = point(
            previous.x + 0.064 + 0.03 * source.motionX + 0.015 * Math.sin(source.direction),
            previous.y + 0.045 * source.motionY - 0.034 * Math.cos(source.direction),
          );
          const location = { kind: 'path', points: [previous, at] } as const;
          previous = at;
          return { at, location };
        });
      }).flat();
    case 'hotspots':
      return Array.from({ length: 64 }, (_, index) => {
        const at = point(((index % 8) + 0.5) / 8, (Math.floor(index / 8) + 0.5) / 8);
        const { light, edge, saturation } = cell(pack, at);
        const intensity = unit(0.55 * light + 0.35 * edge + 0.1 * saturation);
        return {
          at,
          intensity,
          location: { kind: 'ring', center: at, radius: 0.021 + 0.042 * intensity } as const,
        };
      })
        .sort((a, b) => b.intensity - a.intensity)
        .slice(0, 48);
  }
}

type Source = Recipe['pitchSource'] | Recipe['loudnessSource'];

function feature(pack: FeaturePack, at: ImagePoint, source: Source, index: number): number {
  const sample = cell(pack, at, index);
  switch (source) {
    case 'brightness':
      return sample.light;
    case 'hue':
      return sample.hue;
    case 'height':
      return 1 - at.y;
    case 'saturation':
      return sample.saturation;
    case 'edges':
      return sample.edge;
    case 'motion':
      return Math.hypot(sample.motionX, sample.motionY) / Math.SQRT2;
  }
}

export function labScore(pack: FeaturePack, recipe: Recipe): readonly ScoreEvent[] {
  if (recipe.scan === 'lineSweep') return lineSweepScore(pack, recipe);
  const locations = scanLocations(pack, recipe.scan);
  const step = 60 / RECIPE_TEMPO_BPM[recipe.tempo] / 4;
  const duration = step * (recipe.rhythm === 'free' ? 1.4 : 0.85);
  const pulses =
    recipe.rhythm === 'euclidean'
      ? euclideanRhythm(Math.ceil(locations.length * 0.6), locations.length)
      : null;
  return locations.flatMap(({ at, location }, index) => {
    if (pulses && !pulses[index]) return [];
    const note = scaleNote(feature(pack, at, recipe.pitchSource, index), recipe.scale, 48, 3);
    return [
      {
        voice: recipe.voice,
        start: index * step,
        duration,
        pitch: midiToHz(note),
        loudness: feature(pack, at, recipe.loudnessSource, index),
        pan: 2 * at.x - 1,
        location,
      },
    ];
  });
}
