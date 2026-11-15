import { AVATAR_COPY } from '../strings.js';
import { AVATAR_STEPS, type AvatarSelection } from './avatar.js';
import { drawText, measureTextWidth } from './font.js';
import { clearFramebuffer, fillRect, type Framebuffer } from './framebuffer.js';
import {
  AVATAR_HAIR_INDICES,
  AVATAR_SHIRT_INDICES,
  AVATAR_SKIN_INDICES,
  AVATAR_TROUSER_INDICES,
} from './palette.js';

const body = [
  '...ssssss...',
  '..ssssssss..',
  '..ssessess..',
  '..ssssssss..',
  '...ssssss...',
  '....ssss....',
  '..OOoooooo..',
  '.oooooooooo.',
  '.soooooooos.',
  '..ddoooodd..',
] as const;

const legPoses = [
  ['..Ppq..Ppq..', '..Ppq..Ppq..', '..ppq..ppq..', '.bbbb..bbbb.'],
  ['..Ppq..Ppq..', '.Ppq...Ppq..', '.Ppq....Ppq.', 'bbbb....bbb.'],
  ['..Ppq..Ppq..', '...Pppppq...', '....Ppqpb...', '...bbbb.....'],
  ['..Ppq..Ppq..', '..Ppq...Ppq.', '.Ppq....Ppq.', '.bbb....bbbb'],
] as const;

export type ExplorerPose = 0 | 1 | 2 | 3;
const walkCycle = [1, 2, 3, 2] as const;
const stepsPerPose = 6;

export function walkPose(movingSteps: number, reducedMotion: boolean): ExplorerPose {
  if (movingSteps === 0 || reducedMotion) return 0;
  return walkCycle[Math.floor((movingSteps - 1) / stepsPerPose) % walkCycle.length];
}

const hairShapes = [
  { rise: 16, rows: ['...hHHhhh...', '..hHhhhhhh..', '..h......h..'] },
  {
    rise: 18,
    rows: [
      '.....hHHh...',
      '...hHHhhhh..',
      '..hHhhhhhh..',
      '.hhhhhhhhh..',
      '.hhh.....h..',
      '.h..........',
    ],
  },
  {
    rise: 19,
    rows: [
      '....hHHh....',
      '..hHHhhhhh..',
      '.hHHhhhHhhh.',
      '.hHhhhhhhhh.',
      '.hhhHHhhhhh.',
      '.hhh....hhh.',
      '.hh......hh.',
    ],
  },
  {
    rise: 17,
    rows: [
      '...hH..Hh...',
      '..hHhhhhHh..',
      '..hhh..hhh..',
      '.Hh......hH.',
      '.hH......Hh.',
      '.Hh......hH.',
      '.hH......Hh.',
      '..h......h..',
      '..H......H..',
    ],
  },
  {
    rise: 19,
    rows: [
      '........HH..',
      '.......Hhhh.',
      '...hHHhhhhh.',
      '..hHhhhh..hh',
      '..hhhhhhh.hh',
      '..h......hh.',
      '..........hh',
      '..........Hh',
      '...........h',
      '..........h.',
    ],
  },
] as const;

const headgear = [
  { shape: [], colors: [0, 0] },
  { shape: ['...gggggg...', '..gggggGGg..', '..gggggGGGG.'], colors: [12, 11] },
  { shape: ['....gggg....', '...gggggg...', '..gggggggg..', '..GGGGGGGG..'], colors: [7, 15] },
  { shape: ['...gggggg...', '...gggggg...', '..GGGGGGGG..', 'GGGGGGGGGGGG'], colors: [6, 14] },
  { shape: ['............', '............', '............', '..ggggGGgg..'], colors: [10, 11] },
  { shape: ['...gggggg...', '...ggggGg...', '...GGGGGG...', '.gggggggggg.'], colors: [14, 15] },
] as const;

function paintSprite(
  frame: Framebuffer,
  rows: readonly string[],
  left: number,
  top: number,
  scale: number,
  palette: Readonly<Record<string, number | undefined>>,
): void {
  for (const [y, row] of rows.entries()) {
    for (let x = 0; x < row.length; x += 1) {
      const color = palette[row[x]];
      if (color !== undefined) {
        fillRect(frame, left + x * scale, top + y * scale, scale, scale, color);
      }
    }
  }
}

export function drawExplorer(
  frame: Framebuffer,
  x: number,
  feetY: number,
  appearance: AvatarSelection,
  scale = 1,
  pose: ExplorerPose = 0,
): void {
  const left = Math.round(x) - 6 * scale;
  const bottom = Math.round(feetY);
  const legRows = legPoses[pose];
  const [shirt, shirtShadow, shirtHighlight] = AVATAR_SHIRT_INDICES[appearance.outfit];
  const [trousers, trouserShadow, trouserHighlight] = AVATAR_TROUSER_INDICES;
  const colors = {
    s: AVATAR_SKIN_INDICES[appearance.skin],
    e: 0,
    o: shirt,
    d: shirtShadow,
    O: shirtHighlight,
    p: trousers,
    q: trouserShadow,
    P: trouserHighlight,
    b: 13,
  };
  paintSprite(frame, body, left, bottom - (body.length + legRows.length) * scale, scale, colors);
  paintSprite(frame, legRows, left, bottom - legRows.length * scale, scale, colors);
  const hair = hairShapes[appearance.hair];
  paintSprite(frame, hair.rows, left, bottom - hair.rise * scale, scale, {
    h: AVATAR_HAIR_INDICES[0],
    H: AVATAR_HAIR_INDICES[1],
  });
  const gear = headgear[appearance.headgear];
  paintSprite(frame, gear.shape, left, bottom - 19 * scale, scale, {
    g: gear.colors[0],
    G: gear.colors[1],
  });
}

function drawDisc(frame: Framebuffer, x: number, y: number, radius: number, color: number): void {
  for (let dy = -radius; dy <= radius; dy += 1) {
    const span = Math.floor(Math.sqrt(radius * radius - dy * dy));
    fillRect(frame, x - span, y + dy, 2 * span + 1, 1, color);
  }
}

function drawLabel(frame: Framebuffer, text: string, y: number, color: number): void {
  drawText(frame, text, 216 - measureTextWidth(text) / 2, y, color);
}

export function drawAvatarScreen(
  frame: Framebuffer,
  appearance: AvatarSelection,
  step: number,
): void {
  clearFramebuffer(frame, 1);
  drawDisc(frame, 60, 100, 48, 2);
  drawDisc(frame, 60, 100, 37, 3);
  fillRect(frame, 0, 148, 116, 32, 2);
  fillRect(frame, 17, 140, 86, 3, 12);
  fillRect(frame, 23, 143, 74, 5, 4);
  drawExplorer(frame, 60, 140, appearance, 6);

  fillRect(frame, 118, 12, 196, 138, 5);
  fillRect(frame, 120, 14, 192, 134, 1);
  drawText(frame, `${AVATAR_COPY.step} ${step + 1}/${AVATAR_STEPS.length}`, 128, 23, 5);
  for (let index = 0; index < AVATAR_STEPS.length; index += 1) {
    const color = index === step ? 6 : index < step ? 10 : 4;
    fillRect(frame, 128 + index * 45, 44, 40, 4, color);
  }
  drawLabel(frame, AVATAR_COPY.categories[step], 55, 5);

  const { key, choices } = AVATAR_STEPS[step];
  const choice = appearance[key];
  fillRect(frame, 120, 78, 192, 24, 6);
  drawLabel(frame, choices[choice].toUpperCase(), 82, 0);
  drawText(frame, AVATAR_COPY.previous, 126, 105, 5);
  drawText(frame, AVATAR_COPY.next, 294, 105, 5);
  for (let index = 0; index < choices.length; index += 1) {
    fillRect(frame, 147 + index * 23, 112, 18, 4, index === choice ? 6 : 4);
  }
  drawText(frame, AVATAR_COPY.confirm, 130, 127, 5);
  drawText(frame, AVATAR_COPY.back, 224, 127, 5);
}
