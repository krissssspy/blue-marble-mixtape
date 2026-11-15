import { STRINGS } from '../strings.js';
import { drawText } from './font.js';
import { clearFramebuffer, fillRect, type Framebuffer } from './framebuffer.js';

const dusk = {
  sky: 0,
  panel: 1,
  shadow: 2,
  deepOcean: 3,
  ocean: 4,
  cream: 5,
  gold: 6,
  coral: 7,
  land: 8,
  shadedLand: 9,
  teal: 10,
  ice: 11,
  shell: 12,
} as const;

const stars = [
  [18, 24],
  [35, 48],
  [22, 83],
  [31, 120],
  [14, 149],
  [285, 23],
  [303, 44],
  [289, 67],
  [307, 104],
  [286, 135],
  [296, 158],
] as const;

const continents = [
  '.......#####...............',
  '......#######.....####.....',
  '..#########.......#####....',
  '.#########......########...',
  '.########........#########.',
  '..#######......###########.',
  '...#####......############.',
  '....###.......#####..####..',
  '......###......#####...#...',
  '.......###.....######......',
  '........#####...#####......',
  '.........#####...####......',
  '.........#####...###.......',
  '..........####...##....#...',
  '..........###..........##..',
  '...........##.......#####..',
  '...........#.......######..',
  '....................####...',
  '......................#....',
] as const;

function drawCenteredText(frame: Framebuffer, text: string, y: number, index: number): void {
  const width = [...text].length * 12 - 2;
  drawText(frame, text, (frame.width - width) / 2, y, index);
}

function drawEarth(frame: Framebuffer): void {
  const radius = 15;
  for (let y = -radius; y <= radius; y += 1) {
    const span = Math.floor(Math.sqrt(radius * radius - y * y));
    for (let x = -span; x <= span; x += 1) {
      const inShade = x + y > 12;
      const isLand = continents[y + 10]?.[x + 13] === '#';
      let color: number = inShade ? dusk.deepOcean : dusk.ocean;
      if (isLand) color = inShade ? dusk.shadedLand : dusk.land;
      if (y < -12 && Math.abs(x) < 7) color = dusk.ice;
      fillRect(frame, 160 + x, 101 + y, 1, 1, color);
    }
  }
}

export function drawWelcome(frame: Framebuffer): void {
  clearFramebuffer(frame, dusk.sky);
  for (const [x, y] of stars) fillRect(frame, x, y, 1, 1, dusk.ocean);

  fillRect(frame, 50, 14, 220, 120, dusk.cream);
  fillRect(frame, 52, 12, 216, 124, dusk.cream);
  fillRect(frame, 52, 14, 216, 120, dusk.shell);

  fillRect(frame, 64, 20, 192, 49, dusk.cream);
  fillRect(frame, 66, 22, 188, 45, dusk.panel);
  const [firstLine, secondLine] = STRINGS.welcomeTitle.split('\n');
  drawCenteredText(frame, firstLine, 26, dusk.cream);
  drawCenteredText(frame, secondLine, 46, dusk.gold);

  fillRect(frame, 64, 72, 192, 2, dusk.gold);
  fillRect(frame, 64, 74, 192, 2, dusk.coral);
  fillRect(frame, 64, 76, 192, 2, dusk.teal);

  fillRect(frame, 108, 80, 104, 40, dusk.cream);
  fillRect(frame, 110, 82, 100, 36, dusk.sky);
  drawEarth(frame);

  fillRect(frame, 92, 124, 136, 8, dusk.shadow);
  for (const x of [112, 142, 174, 204]) fillRect(frame, x, 126, 4, 4, dusk.sky);
  for (const x of [56, 261]) {
    for (const y of [17, 125]) fillRect(frame, x, y, 3, 3, dusk.cream);
  }

  fillRect(frame, 108, 139, 104, 25, dusk.ocean);
  fillRect(frame, 110, 141, 100, 21, dusk.panel);
  drawCenteredText(frame, STRINGS.start, 143, dusk.cream);
}
