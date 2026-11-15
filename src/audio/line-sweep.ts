import type { FeatureFrame, FeaturePack } from './feature-pack.js';
import { midiToHz } from './pitch.js';
import type { Recipe } from './recipe.js';
import { euclideanRhythm } from './rhythm.js';
import { scaleNote } from './scale.js';
import type { ScoreEvent } from './score.js';

type FeatureSource = Recipe['pitchSource'] | Recipe['loudnessSource'];
const tempoBpm = { slow: 72, medium: 108, fast: 144 };

function feature(frame: FeatureFrame, source: Exclude<FeatureSource, 'height'>, index: number) {
  switch (source) {
    case 'brightness':
      return frame.luminance[index] / 255;
    case 'hue':
      return frame.hue[index] / 255;
    case 'saturation':
      return frame.saturation[index] / 255;
    case 'edges':
      return frame.edgeMagnitude[index] / 255;
    case 'motion':
      return (
        Math.hypot(frame.motionX?.[index] ?? 0, frame.motionY?.[index] ?? 0) / (128 * Math.SQRT2)
      );
  }
}

function columnValue(
  { width, height, frames }: FeaturePack,
  column: number,
  source: FeatureSource,
) {
  let total = 0;
  let weight = 0;
  for (const frame of frames) {
    for (let row = 0; row < height; row += 1) {
      const index = row * width + column;
      if (source === 'height') {
        const brightness = frame.luminance[index];
        const y = height === 1 ? 0.5 : 1 - row / (height - 1);
        total += y * brightness;
        weight += brightness;
      } else {
        total += feature(frame, source, index);
        weight += 1;
      }
    }
  }
  return weight === 0 ? 0.5 : total / weight;
}

export function lineSweepScore(pack: FeaturePack, recipe: Recipe): readonly ScoreEvent[] {
  if (recipe.scan !== 'lineSweep') throw new Error('A line sweep recipe is required.');
  const { width } = pack;
  const step = 60 / tempoBpm[recipe.tempo] / 4;
  const duration = step * (recipe.rhythm === 'free' ? 1.4 : 0.85);
  const pulses =
    recipe.rhythm === 'euclidean' ? euclideanRhythm(Math.ceil(width * 0.6), width) : null;
  const score: ScoreEvent[] = [];

  for (let column = 0; column < width; column += 1) {
    if (pulses && !pulses[column]) continue;
    const x = width === 1 ? 0.5 : column / (width - 1);
    const note = scaleNote(columnValue(pack, column, recipe.pitchSource), recipe.scale, 48, 3);
    score.push({
      voice: recipe.voice,
      start: column * step,
      duration,
      pitch: midiToHz(note),
      loudness: columnValue(pack, column, recipe.loudnessSource),
      pan: 2 * x - 1,
      location: { kind: 'line', from: { x, y: 0 }, to: { x, y: 1 } },
    });
  }
  return score;
}
