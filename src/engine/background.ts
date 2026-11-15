import { BACKDROP_RAMP } from './palette.js';

interface RoomMotifs {
  readonly id: string;
  readonly layers: readonly { readonly motifs: readonly string[] }[];
}

export function assertRoomMotifs(rooms: readonly RoomMotifs[]): void {
  const usedMotifs = new Set<string>();
  for (const { id, layers } of rooms) {
    if (layers.length < 4) throw new Error(`Room ${id} needs at least four backdrop layers.`);
    const motifs = new Set(
      layers.flatMap(({ motifs }) => motifs.map((name) => name.trim())).filter(Boolean),
    );
    if (motifs.size < 10) throw new Error(`Room ${id} needs at least ten distinct motifs.`);

    for (const motif of motifs) {
      if (usedMotifs.has(motif)) throw new Error(`Room ${id} reuses the motif "${motif}".`);
      usedMotifs.add(motif);
    }
  }
}

interface BackgroundContrast {
  readonly backdrop: readonly string[];
  readonly lane: readonly string[];
  readonly text: readonly {
    readonly foreground: string;
    readonly panel: string;
    readonly opaque: boolean;
  }[];
}

function relativeLuminance(hex: string): number {
  const rgb = Number.parseInt(hex.slice(1), 16);
  const [red, green, blue] = [(rgb >> 16) & 255, (rgb >> 8) & 255, rgb & 255].map((byte) => {
    const value = byte / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
}

export function contrastRatio(firstColor: string, secondColor: string): number {
  const first = relativeLuminance(firstColor);
  const second = relativeLuminance(secondColor);
  return (Math.max(first, second) + 0.05) / (Math.min(first, second) + 0.05);
}

export function assertBackgroundContrast({ backdrop, lane, text }: BackgroundContrast): void {
  for (const [index, color] of backdrop.entries()) {
    if (!BACKDROP_RAMP.includes(color)) {
      throw new Error(`Backdrop color ${color} is outside the Dusk ramp.`);
    }
    for (const other of backdrop.slice(index + 1)) {
      if (contrastRatio(color, other) > 2) {
        throw new Error(`Backdrop colors ${color} and ${other} exceed 2:1 contrast.`);
      }
    }
    for (const laneColor of lane) {
      if (contrastRatio(color, laneColor) < 3) {
        throw new Error(`Lane color ${laneColor} has less than 3:1 contrast against ${color}.`);
      }
    }
  }

  for (const { foreground, panel, opaque } of text) {
    if (!opaque || contrastRatio(foreground, panel) < 4.5) {
      throw new Error('Text needs an opaque panel with at least 4.5:1 contrast.');
    }
  }
}
