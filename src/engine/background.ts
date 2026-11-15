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
