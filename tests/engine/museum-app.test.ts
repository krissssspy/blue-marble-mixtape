import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import sharp from 'sharp';
import { describe, expect, it, vi } from 'vitest';
import { createFramebuffer, type Framebuffer } from '../../src/engine/framebuffer.js';
import type { MuseumCatalog } from '../../src/engine/museum-assets.js';
import { walkwayHeight } from '../../src/engine/walkway.js';
import {
  createMuseumRooms,
  drawDoor,
  drawRoom,
  type MountedArtifact,
} from '../../src/museum-rooms.js';
import { loadMuseumThumbnail } from '../../src/museum-thumbnails.js';

const catalog = JSON.parse(
  readFileSync(new URL('../../public/catalog.json', import.meta.url), 'utf8'),
) as MuseumCatalog;
const practiceArtifact = catalog.artifacts.find(({ featured }) => featured)!;
const practiceThumbnail = new Uint8Array(48 * 27).fill(10);
const assets = { catalog, practiceArtifact, practiceThumbnail };

function digest(frame: Framebuffer): string {
  return createHash('sha256').update(frame.pixels).digest('hex');
}

function pixel(frame: Framebuffer, x: number, y: number): number {
  return frame.pixels[y * frame.width + x];
}

describe('browser room layout', () => {
  it('starts with a continuous tutorial and installs the curated exhibits after loading', () => {
    const [pending, ...hidden] = createMuseumRooms();
    expect(hidden).toEqual([]);
    expect(pending).toMatchObject({ id: 'tutorial', width: 320, spots: [] });
    expect(pending.walkway[1].x).toBeGreaterThan(pending.walkway[0].x);

    const [tutorial, ...rooms] = createMuseumRooms(assets);
    expect(tutorial.spots).toEqual([
      { id: practiceArtifact.id, x: 160, range: 27, artifact: practiceArtifact },
    ]);
    expect(rooms.map(({ id }) => id)).toEqual([
      'sea-level',
      'air-quality',
      'biodiversity',
      'wildfires',
      'greenhouse-gases',
      'energy',
      'disasters',
      'water-resources',
      'agriculture',
      'lab',
    ]);
    expect(rooms.map(({ name }) => name)).toContain('Sea Level');
    expect(rooms[0].spots[0].id).toBe('svs-media-479017-main');
    for (const room of rooms) {
      const catalogued = catalog.artifacts.filter(({ room: group }) => group === room.id);
      if (room.id === 'lab') {
        expect(room.spots.map(({ artifact }) => artifact)).toEqual(catalogued);
      } else {
        expect(room.spots.length, room.id).toBeGreaterThanOrEqual(8);
        expect(room.spots.length, room.id).toBeLessThanOrEqual(10);
        expect(catalogued).toEqual(
          expect.arrayContaining(room.spots.map(({ artifact }) => artifact)),
        );
      }
      expect(room.walkway[0]).toEqual({ x: 18, y: 148 });
      expect(room.walkway.at(-1)).toEqual({ x: room.width - 18, y: 148 });
      expect(room.width).toBeGreaterThanOrEqual(320);
      expect(
        room.spots.every(({ x, range }) => x > 18 && x < room.width - 18 && range === 27),
      ).toBe(true);
    }
  });

  it('gives each exhibit its own continuous route and draws ramps under the explorer', () => {
    const exhibits = createMuseumRooms(assets).slice(1, -1);
    const profiles = new Set<string>();
    for (const { width, walkway } of exhibits) {
      expect(walkway.length).toBeGreaterThan(2);
      expect(new Set(walkway.map(({ y }) => y)).size).toBeGreaterThan(1);
      expect(walkway.every(({ x }, index) => index === 0 || x > walkway[index - 1].x)).toBe(true);
      expect(walkway.every(({ y }) => y >= 137 && y <= 157)).toBe(true);
      profiles.add(walkway.map(({ y }) => y).join(','));
      for (let x = 1; x < width - 1; x += 8) {
        expect(Math.abs(walkwayHeight(walkway, x + 1) - walkwayHeight(walkway, x))).toBeLessThan(1);
      }
    }
    expect(profiles.size).toBe(9);

    const room = exhibits[0];
    const frame = createFramebuffer();
    const explorerX = Math.round(room.width * 0.5);
    const left = explorerX - 160;
    const floor = Math.round(walkwayHeight(room.walkway, explorerX));
    drawRoom(frame, {
      room,
      track: 1,
      left,
      explorerX,
      avatar: { skin: 0, hair: 0, outfit: 0, headgear: 0 },
      focusId: null,
      focus: { tick: 0, pulse: false, sparkles: false },
      parallax: false,
      hasNext: true,
      thumbnailFor: () => practiceThumbnail,
    });
    expect(pixel(frame, 156, floor - 1)).toBe(13);
    expect(pixel(frame, 156, floor)).toBe(12);
    expect(pixel(frame, 156, 148)).not.toBe(12);
  });

  it('uses no repeated images across the nine exhibits and keeps the original catalog', async () => {
    const rooms = createMuseumRooms(assets).slice(1, -1);
    const exhibits = rooms.flatMap(({ spots }) => spots.map(({ artifact }) => artifact));
    expect(new Set(exhibits.map(({ id }) => id)).size).toBe(exhibits.length);
    expect(new Set(exhibits.map(({ originalImage }) => originalImage.url)).size).toBe(
      exhibits.length,
    );
    const rasterHashes = await Promise.all(
      exhibits.map(async ({ mediaPaths }) => {
        const input = readFileSync(new URL(`../../public${mediaPaths.preview}`, import.meta.url));
        const raster = await sharp(input)
          .resize(64, 36, { fit: 'contain', background: '#000' })
          .removeAlpha()
          .raw()
          .toBuffer();
        return createHash('sha256').update(raster).digest('hex');
      }),
    );
    expect(new Set(rasterHashes).size).toBe(exhibits.length);
    expect(assets.catalog.artifacts.length).toBeGreaterThan(exhibits.length);
  });

  it('does not place missing or reassigned artifacts in the exhibit', () => {
    const catalogWithChanges = {
      ...catalog,
      artifacts: catalog.artifacts
        .filter(({ id }) => id !== 'svs-media-479017-main')
        .map((artifact) =>
          artifact.id === 'svs-page-5425-376521' ? { ...artifact, room: 'lab' } : artifact,
        ),
    };
    const sea = createMuseumRooms({ ...assets, catalog: catalogWithChanges })[1];
    expect(sea.spots[0].id).toBe('svs-page-5425-376522');
    expect(sea.spots).toHaveLength(8);
  });

  it('keeps the lab on its own flat floor and scrolls its backdrop separately', () => {
    const room = createMuseumRooms(assets).at(-1)!;
    const frame = createFramebuffer();
    frame.pixels.fill(7);
    const view = {
      room,
      track: 10,
      left: 31,
      explorerX: 72,
      avatar: { skin: 0, hair: 0, outfit: 0, headgear: 0 },
      focusId: null,
      focus: { tick: 0, pulse: false, sparkles: false },
      parallax: true,
      hasNext: false,
      thumbnailFor: () => practiceThumbnail,
    };
    drawRoom(frame, view);
    expect(pixel(frame, 5, 77)).toBe(2);
    expect(pixel(frame, 32, 77)).toBe(1);
    expect(pixel(frame, 10, 82)).toBe(3);
    expect(pixel(frame, 10, 83)).toBe(2);
    expect(pixel(frame, 10, 106)).toBe(3);
    expect(pixel(frame, 10, 107)).toBe(2);
    expect(pixel(frame, 10, 129)).toBe(4);
    expect(pixel(frame, 10, 148)).toBe(12);
    drawRoom(frame, { ...view, parallax: false });
    expect(pixel(frame, 32, 77)).toBe(2);
  });

  it('requests framed thumbnails around the camera and draws a focus cue above the native pixels', () => {
    const room = createMuseumRooms(assets)[1];
    const frame = createFramebuffer();
    const thumbnailFor = vi.fn<(spot: MountedArtifact) => Uint8Array>(() => practiceThumbnail);
    const common = {
      room,
      track: 1,
      left: 0,
      explorerX: 32,
      avatar: { skin: 0, hair: 0, outfit: 0, headgear: 0 },
      focusId: room.spots[0].id,
      focus: { tick: 0, pulse: true, sparkles: true },
      parallax: true,
      hasNext: true,
      thumbnailFor,
    };

    frame.pixels.fill(9);
    drawRoom(frame, common);
    const entrance = digest(frame);

    expect(room.spots[0].x).toBe(88);
    expect(thumbnailFor.mock.calls.map(([spot]) => spot.id)).toEqual(
      room.spots.slice(0, 4).map(({ id }) => id),
    );
    expect(pixel(frame, 88, 105)).toBe(10);
    expect(pixel(frame, 88, 98)).toBe(6);
    expect(pixel(frame, 18, 130)).toBe(0);

    const lastView = room.width - frame.width;
    thumbnailFor.mockClear();
    drawRoom(frame, {
      ...common,
      left: lastView,
      explorerX: room.width - 40,
      focusId: null,
      hasNext: false,
    });

    expect(thumbnailFor.mock.calls.map(([spot]) => spot.id)).toEqual(
      room.spots.filter(({ x }) => x >= lastView - 40).map(({ id }) => id),
    );
    expect(pixel(frame, frame.width - 18, 130)).not.toBe(0);
    const end = digest(frame);
    drawRoom(frame, { ...common, left: lastView });
    expect(pixel(frame, frame.width - 18, 130)).toBe(0);
    const openExit = digest(frame);

    drawRoom(frame, { ...common, left: lastView - 3, explorerX: room.width - 40 });
    expect([entrance, end, openExit, digest(frame)]).toEqual([
      'bf94bd0940cec268c6305a57fb2129e3850b176f739ca1678a76450629721792',
      '7cda470dfa0595194cd1e0b3346cfe5513a678971325c61ca3ff035a93faabfc',
      '0de962691ce0c64046ebfac92e28ebd6703319a3cc934f38cf84069f12eb733d',
      'ac812e4d612a26d9f99138de897a901a6a96b07177b55eaf1b9a0b2f80f67359',
    ]);
  });

  it('draws a doorway with a gold handle when loaded assets have not opened it', () => {
    const frame = createFramebuffer();
    frame.pixels.fill(2);
    drawDoor(frame, 60, 148, false);
    expect(pixel(frame, 60, 120)).toBe(13);
    expect(pixel(frame, 63, 130)).toBe(6);
    expect(pixel(frame, 62, 129)).not.toBe(6);

    drawDoor(frame, 60, 148, true);
    expect(pixel(frame, 60, 120)).toBe(0);
    expect(pixel(frame, 63, 130)).not.toBe(6);
    expect(pixel(frame, 60, 113)).toBe(4);
  });

  it('keeps the backdrop still at the same screen coordinates when parallax is disabled', () => {
    const room = createMuseumRooms(assets)[1];
    const frame = createFramebuffer();
    const view = {
      room,
      track: 1,
      left: 64,
      explorerX: 100,
      avatar: { skin: 0, hair: 0, outfit: 0, headgear: 0 },
      focusId: null,
      focus: { tick: 0, pulse: false, sparkles: false },
      parallax: false,
      hasNext: true,
      thumbnailFor: () => practiceThumbnail,
    };
    drawRoom(frame, view);
    const backdrop = () => frame.pixels.slice(80 * frame.width, 81 * frame.width);
    const frozen = backdrop();
    drawRoom(frame, { ...view, left: 0 });
    expect(backdrop()).toEqual(frozen);
    drawRoom(frame, { ...view, parallax: true });
    expect(backdrop()).not.toEqual(frozen);
  });
});

describe('browser thumbnail decoding', () => {
  function makeDocument() {
    const image = { src: '', decode: vi.fn(async () => undefined) };
    const rgba = new Uint8ClampedArray(48 * 27 * 4);
    rgba.set([11, 16, 38, 255, 255, 204, 51, 255, 111, 130, 168, 255, 63, 166, 106, 255]);
    const context = {
      imageSmoothingEnabled: true,
      drawImage: vi.fn(),
      getImageData: vi.fn(() => ({ data: rgba })),
    };
    const canvas = { width: 0, height: 0, getContext: vi.fn(() => context) };
    const createElement = vi.fn((tag: string) => (tag === 'img' ? image : canvas));
    return { document: { createElement } as unknown as Document, image, canvas, context };
  }

  it('decodes the catalog thumbnail and maps exact RGB colors to Dusk indices', async () => {
    const { document, image, canvas, context } = makeDocument();
    const path = practiceArtifact.mediaPaths.thumbnail;
    const pixels = await loadMuseumThumbnail(document, path);

    expect(image.src).toBe(path);
    expect(image.decode).toHaveBeenCalledOnce();
    expect([canvas.width, canvas.height]).toEqual([48, 27]);
    expect(canvas.getContext).toHaveBeenCalledWith('2d');
    expect(context.imageSmoothingEnabled).toBe(false);
    expect(context.drawImage).toHaveBeenCalledWith(image, 0, 0, 48, 27);
    expect(context.getImageData).toHaveBeenCalledWith(0, 0, 48, 27);
    expect(pixels).toHaveLength(48 * 27);
    expect([...pixels.slice(0, 5)]).toEqual([0, 6, 12, 8, 0]);
  });

  it('fails meaningfully when a canvas cannot decode the thumbnail', async () => {
    const { document, canvas } = makeDocument();
    canvas.getContext.mockReturnValueOnce(null as never);

    await expect(
      loadMuseumThumbnail(document, practiceArtifact.mediaPaths.thumbnail),
    ).rejects.toThrow(/decode.*thumbnail/i);
  });
});
