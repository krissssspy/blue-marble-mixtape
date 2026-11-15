import type { ExhibitId } from '../exhibit-selection.js';
import type { FeaturePack } from './feature-pack.js';
import { cell, hilbertCell, point, unit } from './image-features.js';
import { midiToHz } from './pitch.js';
import { seededRandom } from './random.js';
import { euclideanRhythm } from './rhythm.js';
import { scaleNote } from './scale.js';
import type { ImagePoint, ScoreEvent, ScoreLocation, VoiceName } from './score.js';

type Note = (
  voice: VoiceName,
  start: number,
  duration: number,
  midi: number,
  loudness: number,
  location: ScoreLocation,
  panX: number,
) => void;

function dot(at: ImagePoint): ScoreLocation {
  return { kind: 'point', ...at };
}

function seaLevel(pack: FeaturePack, add: Note): void {
  for (let stream = 0; stream < 5; stream += 1) {
    const trail: ImagePoint[] = [point(0.11 + 0.14 * stream, 0.22 + 0.13 * stream)];
    for (let step = 0; step < 8; step += 1) {
      const at = trail[trail.length - 1];
      const signal = cell(pack, at, step);
      const motionX = 0.04 * signal.motionX + 0.03 * Math.sin(signal.direction);
      const motionY = 0.04 * signal.motionY - 0.028 * Math.cos(signal.direction);
      trail.push(point(at.x + 0.025 + motionX, at.y + motionY));
      const start = 0.42 * step + 0.19 * stream;
      const rise = (step + 2 * stream) % 12;
      const ascent = Math.sin((Math.PI * rise) / 12) ** 2;
      const pitch = 39 + rise + 5 * (signal.light - 0.5);
      const location = { kind: 'path', points: trail.slice(Math.max(0, step - 3)) } as const;
      add('pad', start, 1.35, pitch, 0.1 + ascent * 0.15, location, at.x);
      add('pad', start, 1.32, pitch + 12, 0.19 - ascent * 0.12, location, at.x);
      if (step % 4 === 0) add('triangle', start, 1.55, 29 + 2 * signal.light, 0.1, dot(at), at.x);
    }
  }
}

function airQuality(pack: FeaturePack, add: Note): void {
  for (let step = 0; step < 64; step += 1) {
    const at = hilbertCell(step);
    const { hue, saturation, edge } = cell(pack, at, step);
    const concentration = unit(0.65 * (1 - hue) * saturation + 0.35 * edge);
    const when = 0.0675 * step + (step % 2) * 0.015;
    add(
      'pulse',
      when,
      0.044 + 0.06 * concentration,
      46 + Math.floor(concentration * 17),
      0.12 + 0.32 * concentration,
      dot(at),
      at.x,
    );
    if (step % 2 === 0 || concentration > 0.55) {
      const grains = 1 + Math.floor(3 * concentration);
      for (let grain = 0; grain < grains; grain += 1) {
        add(
          'noise',
          when + grain * 0.014,
          0.024 + 0.045 * concentration,
          68,
          0.08 + concentration * 0.18,
          dot(at),
          at.x,
        );
      }
    }
  }
}

function biodiversity(pack: FeaturePack, add: Note): void {
  for (let column = 0; column < 18; column += 1) {
    const x = (column + 0.5) / 18;
    const time = column * 0.22;
    const scan = { kind: 'line', from: point(x, 0), to: point(x, 1) } as const;
    add('organ', time, 0.31, 55 + (column % 5) * 2, 0.06, scan, x);
    for (let band = 0; band < 7; band += 1) {
      const at = point(x, (band + 0.5) / 7);
      const sample = cell(pack, at, column);
      if (sample.light < 0.32 && band !== column % 7) continue;
      const pitch = scaleNote(1 - at.y, 'majorPentatonic', 62, 3);
      add('organ', time, 0.24, pitch, 0.035 + sample.light * 0.075, dot(at), x);
      if ((band + column) % 5 === 0 || sample.edge > 0.48) {
        add('bell', time + 0.07, 0.32, pitch + 7, 0.05 + 0.18 * sample.edge, dot(at), x);
      }
    }
  }
}

function wildfires(pack: FeaturePack, add: Note): void {
  for (let bar = 0; bar < 6; bar += 1) {
    const heat = Array.from({ length: 8 }, (_, step) => {
      const at = point((step + 0.5) / 8, (bar + 0.5) / 6);
      const sample = cell(pack, at, bar + step);
      const isWarm = sample.hue < 0.17 || sample.hue > 0.93;
      const signal = unit(sample.change * 1.4 + sample.saturation * (isWarm ? 0.8 : 0.2));
      return { at, signal };
    });
    const burned = heat.filter(({ signal }) => signal > 0.28).length;
    const rhythm = euclideanRhythm(Math.max(2, burned), 8);
    for (const [step, { at, signal }] of heat.entries()) {
      if (!rhythm[step]) continue;
      const start = (bar * 8 + step) * 0.105;
      const radius = 0.022 + 0.03 * signal;
      const location = { kind: 'ring', center: at, radius } as const;
      add('noise', start, 0.05 + 0.12 * signal, 53, 0.35 + 0.35 * signal, location, at.x);
      add('pulse', start, 0.1, 31 + 7 * signal, 0.38, dot(at), at.x);
      if (step % 2 === 0) add('bell', start + 0.036, 0.13, 39 + 10 * signal, 0.22, dot(at), at.x);
    }
  }
}

function greenhouseGases(pack: FeaturePack, add: Note): void {
  let previous = point(0, 0.5);
  const intervals = [0, 3, 7, 12];
  for (let column = 0; column < 14; column += 1) {
    const x = column / 13;
    const bands = Array.from({ length: 10 }, (_, row) => point(x, row / 9));
    const score = (at: ImagePoint) => {
      const { edge, saturation, light } = cell(pack, at);
      return edge * 0.55 + saturation * 0.32 + light * 0.13;
    };
    const line = bands.reduce((strongest, at) => (score(at) > score(strongest) ? at : strongest));
    const shape = { kind: 'line', from: previous, to: line } as const;
    previous = line;
    const when = column * 0.32;
    const root = scaleNote(1 - line.y, 'dorian', 41, 2);
    for (const [part, interval] of intervals.entries()) {
      const row = bands[(Math.round(line.y * 9) + part * 2) % bands.length];
      const tone = cell(pack, row);
      add(
        'organ',
        when + part * 0.031,
        0.66,
        root + interval + Math.floor(tone.hue * 3),
        0.1 + tone.saturation * 0.045,
        part === 0 ? shape : dot(row),
        0.18 + 0.22 * part,
      );
    }
    if (column % 4 === 0) add('organ', when + 0.25, 0.15, root + 14, 0.13, dot(line), x);
  }
}

function energy(pack: FeaturePack, add: Note): void {
  const lights = Array.from({ length: 63 }, (_, index) => {
    const at = point(((index % 9) + 0.5) / 9, (Math.floor(index / 9) + 0.5) / 7);
    const sample = cell(pack, at);
    return { at, light: sample.light + 0.34 * sample.edge };
  }).sort((left, right) => right.light - left.light);
  const nodes: typeof lights = [];
  const distance = (a: ImagePoint, b: ImagePoint) => Math.hypot(a.x - b.x, a.y - b.y);
  for (const light of lights) {
    if (nodes.length === 10) break;
    if (nodes.every((node) => distance(node.at, light.at) > 0.14)) nodes.push(light);
  }
  const connected = [nodes[0]];
  let onset = 0;
  while (connected.length < nodes.length) {
    const unconnected = nodes.filter((node) => !connected.includes(node));
    const edges = connected.flatMap((from) =>
      unconnected.map((to) => ({
        from,
        to,
        length: distance(from.at, to.at),
      })),
    );
    const { from, to } = edges.reduce((first, second) =>
      second.length < first.length ? second : first,
    );
    connected.push(to);
    const path = { kind: 'line', from: from.at, to: to.at } as const;
    const key = scaleNote(unit(to.light), 'minorPentatonic', 48, 2);
    for (const [index, interval] of [0, 7, 12, 15].entries()) {
      add('pulse', onset + index * 0.083, 0.16, key + interval, 0.22, path, to.at.x);
    }
    add('pad', onset, 0.73, key - 12, 0.24, dot(from.at), from.at.x);
    add('triangle', onset, 0.14, 30, 0.25, dot(to.at), 0.5);
    onset += 0.36;
  }
}

function disasters(pack: FeaturePack, add: Note): void {
  const candidates = Array.from({ length: 25 }, (_, index) =>
    point(0.3 + (index % 5) / 10, 0.3 + Math.floor(index / 5) / 10),
  );
  const spokes = Array.from({ length: 8 }, (_, index) => (index * Math.PI) / 4);
  const eyeContrast = (at: ImagePoint) =>
    spokes.reduce(
      (total, angle) =>
        total +
        cell(pack, point(at.x + 0.12 * Math.cos(angle), at.y + 0.12 * Math.sin(angle))).light,
      0,
    ) /
      spokes.length -
    cell(pack, at).light;
  const center = candidates.reduce((best, at) => (eyeContrast(at) > eyeContrast(best) ? at : best));
  for (let step = 0; step < 24; step += 1) {
    const angle = (step / 24) * 2 * Math.PI;
    const mid = point(center.x + 0.22 * Math.cos(angle), center.y + 0.22 * Math.sin(angle));
    const edge = point(center.x + 0.65 * Math.cos(angle), center.y + 0.65 * Math.sin(angle));
    const wind = cell(pack, mid, step);
    const start = step * 0.205;
    const sweep = { kind: 'line', from: center, to: edge } as const;
    add('pad', start, 0.86, 39 + 7 * wind.light + 3 * Math.sin(angle), 0.16, sweep, mid.x);
    add('triangle', start, 0.39, 52 + 11 * wind.edge, 0.14 + 0.14 * wind.edge, sweep, mid.x);
    if (step % 4 === 0 || wind.change > 0.4) {
      add('bell', start + 0.07, 0.52, 35 + 14 * wind.edge, 0.36, dot(mid), mid.x);
      add('noise', start + 0.15 + 0.1 * wind.light, 0.22, 43, 0.22, dot(mid), mid.x);
    }
  }
}

function waterResources(pack: FeaturePack, add: Note): void {
  const random = seededRandom(pack.width * 101 + pack.height);
  const drops: ImagePoint[] = [];
  for (let attempt = 0; attempt < 128 && drops.length < 18; attempt += 1) {
    const at = point(random(), random());
    const wet = cell(pack, at).light;
    if (wet < 0.3 && attempt < 36) continue;
    if (drops.every((drop) => Math.hypot(drop.x - at.x, drop.y - at.y) > 0.11)) drops.push(at);
  }
  for (const [index, at] of drops.entries()) {
    const wetness = cell(pack, at, index).light;
    const start = 0.245 * index + (index % 2) * 0.085;
    const pitch = scaleNote(wetness, 'majorPentatonic', 57, 2);
    const drip = { kind: 'ring', center: at, radius: 0.018 + wetness * 0.05 } as const;
    add('bell', start, 0.68, pitch, 0.18 + wetness * 0.18, drip, at.x);
    const route = [at];
    for (let step = 0; step < 4; step += 1) {
      const next = route[route.length - 1];
      const nearby = [-0.05, 0, 0.05].map((offset) => point(next.x + offset, next.y + 0.07));
      route.push(
        nearby.reduce((first, second) =>
          cell(pack, second).light < cell(pack, first).light ? second : first,
        ),
      );
    }
    add('pluck', start + 0.14, 0.42, pitch - 12, 0.17, { kind: 'path', points: route }, at.x);
    if (index % 4 === 0) add('pluck', start, 0.75, 31 + wetness * 7, 0.39, dot(at), 0.5);
    if (index % 4 === 2) add('noise', start - 0.06, 0.12, 62, 0.13, dot(at), 0.5);
  }
}

function agriculture(pack: FeaturePack, add: Note): void {
  let lastClass = 0;
  for (let row = 0; row < 4; row += 1) {
    for (let step = 0; step < 8; step += 1) {
      const x = (row % 2 === 0 ? step : 7 - step) / 8;
      const y = row / 4;
      const at = point(x + 1 / 16, y + 1 / 8);
      const sample = cell(pack, at, row);
      const crop = Math.min(4, Math.floor(5 * (0.75 * sample.hue + 0.25 * sample.saturation)));
      const transition = (lastClass * 2 + crop + Math.floor(sample.light * 4)) % 7;
      lastClass = crop;
      const pitch = scaleNote(transition / 6, 'majorPentatonic', 48, 2);
      const t = (row * 8 + step) * 0.155;
      const field = { kind: 'region', x, y, width: 1 / 8, height: 1 / 4 } as const;
      add('pluck', t, 0.28, pitch, 0.23 + 0.22 * sample.light, field, at.x);
      if (step % 2 === 0) add('pluck', t + 0.055, 0.24, pitch + 7, 0.19, field, at.x);
      if (step % 4 === 0) add('triangle', t, 0.29, pitch - 24, 0.16, field, 0.5);
      if (step % 4 === 2) add('noise', t, 0.07, 45, 0.15, field, 0.5);
    }
  }
}

const profiles = {
  'sea-level': seaLevel,
  'air-quality': airQuality,
  biodiversity,
  wildfires,
  'greenhouse-gases': greenhouseGases,
  energy,
  disasters,
  'water-resources': waterResources,
  agriculture,
} satisfies Record<ExhibitId, (pack: FeaturePack, add: Note) => void>;

export function exhibitScore(exhibit: ExhibitId, pack: FeaturePack): readonly ScoreEvent[] {
  const events: ScoreEvent[] = [];
  profiles[exhibit](pack, (voice, start, duration, midi, loudness, location, panX) => {
    events.push({
      voice,
      start,
      duration,
      pitch: midiToHz(midi),
      loudness,
      location,
      pan: 2 * panX - 1,
    });
  });
  return events.sort((first, second) => first.start - second.start);
}
