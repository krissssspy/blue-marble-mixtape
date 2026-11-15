import { STRINGS } from '../strings.js';
import { drawText, measureTextWidth } from './font.js';
import { clearFramebuffer, fillRect, type Framebuffer } from './framebuffer.js';

const dusk = {
  sky: 0,
  panel: 1,
  shadow: 2,
  nightOcean: 3,
  ocean: 4,
  cream: 5,
  land: 8,
  shadedLand: 9,
  teal: 10,
  ice: 11,
  haze: 12,
} as const;

const earth = { x: 240, y: 85, radius: 52 };
const stars = [
  [12, 20, 3],
  [29, 15, 4],
  [66, 20, 2],
  [95, 12, 3],
  [124, 24, 4],
  [153, 15, 3],
  [166, 48, 3],
  [174, 20, 12],
  [193, 10, 4],
  [211, 19, 2],
  [246, 13, 4],
  [281, 26, 3],
  [302, 16, 4],
  [313, 30, 3],
  [300, 74, 3],
  [310, 92, 4],
  [315, 122, 2],
  [298, 136, 4],
  [309, 154, 3],
  [281, 161, 4],
  [255, 156, 3],
  [225, 165, 3],
  [214, 153, 4],
  [195, 161, 2],
  [180, 135, 3],
  [166, 152, 4],
  [145, 160, 3],
  [116, 166, 3],
  [81, 156, 4],
  [65, 167, 2],
  [36, 157, 3],
  [21, 170, 3],
  [10, 151, 4],
  [5, 87, 3],
  [14, 67, 4],
] as const;

const continents = [
  '........................................................................',
  '..........................##............................................',
  '........................#######.........................................',
  '............#...###....########..................###.##########.........',
  '...##########################..........###############################..',
  '...########################...........#################################.',
  '......#################............#..###############################...',
  '..........##############..........##.###############################....',
  '...........############............#############################........',
  '............#########.............#..#.########################.........',
  '............########..............#......####################...#.......',
  '.............#######..............########...###############...#........',
  '..............###.##..............############.#############............',
  '...............##................##########.###...#########.............',
  '.................#...............##############...##..###...#...........',
  '.....................#...........#############.....#...##...#...........',
  '....................####.........#############.........#................',
  '....................######.........##########..........#..##............',
  '....................########........########............#.#...###.......',
  '....................#########........#######.............#.....###......',
  '....................#########.........######............................',
  '.....................#######..........#####..#..............#####.......',
  '.....................######...........#####..#.............#######......',
  '......................####............####.................########.....',
  '.....................####..............##..................###.###......',
  '.....................###........................................##......',
  '.....................##...............................................#.',
  '.....................##.................................................',
  '......................#.................................................',
  '........................................................................',
  '........................................................................',
  '........................................................................',
  '########################################################################',
  '########################################################################',
  '########################################################################',
  '########################################################################',
] as const;

const longitudeCount = continents[0].length;

// Project the atlas onto the visible hemisphere once. Only the longitude changes as Earth turns.
const surface = Array.from({ length: earth.radius * 2 + 1 }, (_, row) => {
  const y = row - earth.radius;
  const latitude = Math.min(
    continents.length - 1,
    Math.floor((0.5 + Math.asin(y / earth.radius) / Math.PI) * continents.length),
  );
  const span = Math.floor(Math.sqrt(earth.radius ** 2 - y ** 2));
  return Array.from({ length: span * 2 + 1 }, (_, column) => {
    const x = column - span;
    const depth = Math.sqrt(earth.radius ** 2 - x ** 2 - y ** 2) / earth.radius;
    const longitude = Math.floor(
      (0.56 + Math.atan2(x, depth * earth.radius) / (2 * Math.PI)) * longitudeCount,
    );
    const light = (-0.65 * x - 0.51 * y) / earth.radius + 0.49 * depth;
    return { x, y, latitude, longitude, depth, light } as const;
  });
}).flat();

const orbit = Array.from({ length: 180 }, (_, step) => {
  const phase = (step * Math.PI) / 90;
  const major = 82 * Math.cos(phase);
  const minor = 30 * Math.sin(phase);
  const tilt = -0.46;
  return {
    x: Math.round(earth.x + major * Math.cos(tilt) - minor * Math.sin(tilt)),
    y: Math.round(earth.y + major * Math.sin(tilt) + minor * Math.cos(tilt)),
  };
});

function drawHalo(frame: Framebuffer, radius: number, tone: number): void {
  for (let y = -radius; y <= radius; y += 1) {
    const span = Math.floor(Math.sqrt(radius ** 2 - y ** 2));
    fillRect(frame, earth.x - span, earth.y + y, span * 2 + 1, 1, tone);
  }
}

function drawEarth(frame: Framebuffer, tick: number): void {
  const turn = ((Math.floor(tick / 10) % longitudeCount) + longitudeCount) % longitudeCount;
  for (const { x, y, latitude, longitude, depth, light } of surface) {
    const land = continents[latitude][(longitude + turn) % longitudeCount] === '#';
    let color: number;
    if (depth < 0.24 && light > 0.24) {
      color = depth < 0.17 ? dusk.ice : dusk.teal;
    } else if (latitude >= 32 || latitude <= 1) {
      color = light > 0.18 ? dusk.haze : dusk.ocean;
    } else if (land) {
      color = light > 0.18 ? dusk.land : dusk.shadedLand;
    } else {
      color = light > 0.1 ? dusk.ocean : dusk.nightOcean;
    }
    fillRect(frame, earth.x + x, earth.y + y, 1, 1, color);
  }
}

function drawOrbit(frame: Framebuffer): void {
  for (const [step, { x, y }] of orbit.entries()) {
    if (step % 5 < 3) fillRect(frame, x, y, 1, 1, step < 90 ? dusk.haze : dusk.ocean);
  }

  const marker = orbit[13];
  fillRect(frame, marker.x - 4, marker.y, 9, 1, dusk.ocean);
  fillRect(frame, marker.x, marker.y - 4, 1, 9, dusk.ocean);
  fillRect(frame, marker.x - 1, marker.y - 1, 3, 3, dusk.ice);
}

function drawTitle(frame: Framebuffer): void {
  fillRect(frame, 18, 36, 145, 116, dusk.panel);
  fillRect(frame, 18, 36, 145, 1, dusk.shadow);
  fillRect(frame, 18, 36, 1, 116, dusk.shadow);
  fillRect(frame, 18, 151, 145, 1, dusk.sky);

  for (const [column, height] of [3, 6, 10, 16, 10, 6, 3].entries()) {
    fillRect(frame, 24 + column * 4, 39 - Math.floor(height / 2), 2, height, dusk.teal);
  }
  fillRect(frame, 56, 39, 96, 1, dusk.ocean);

  drawText(frame, STRINGS.welcomeTitle, 24, 65, dusk.cream);

  fillRect(frame, 24, 96, 128, 1, dusk.nightOcean);
  fillRect(frame, 24, 96, 32, 1, dusk.teal);

  fillRect(frame, 29, 115, 117, 31, dusk.sky);
  fillRect(frame, 24, 111, 119, 31, dusk.ocean);
  fillRect(frame, 24, 111, 119, 1, dusk.ice);
  fillRect(frame, 24, 111, 2, 31, dusk.teal);
  fillRect(frame, 27, 114, 113, 25, dusk.nightOcean);
  const start = STRINGS.start;
  drawText(frame, start, 83 - Math.floor(measureTextWidth(start) / 2), 119, dusk.cream);
}

export function drawWelcome(frame: Framebuffer, tick = 0): void {
  clearFramebuffer(frame, dusk.sky);
  drawHalo(frame, 65, dusk.panel);
  drawHalo(frame, 58, dusk.shadow);
  for (const [x, y, tone] of stars) fillRect(frame, x, y, 1, 1, tone);
  drawOrbit(frame);
  drawEarth(frame, tick);
  drawTitle(frame);
}
