import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import sharp from 'sharp';
import { describe, expect, it, vi } from 'vitest';
import { createFramebuffer, type Framebuffer } from '../../src/engine/framebuffer.js';
import type { MuseumCatalog } from '../../src/engine/museum-assets.js';
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
      expect(room.walkway).toEqual([
        { x: 18, y: 148 },
        { x: room.width - 18, y: 148 },
      ]);
      expect(room.width).toBeGreaterThanOrEqual(320);
      expect(
        room.spots.every(({ x, range }) => x > 18 && x < room.width - 18 && range === 27),
      ).toBe(true);
    }
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
      '94cefa0c6f3c8213c0022fa81d5d760b4282a6ecf3826c54b47d89569ebf89b1',
      'c7d2677b060eff7d312c08ab7cf86ac574b72dceb8540602f7b42f720d421476',
      'f17aef43f719f685f19e648b0d74b4b72cec191dfed9af3a71a840ef5c22f9ca',
      'e5ed6620567b93a9d193d8b70ae486db1359defc8ea6f3c408acedb3ddf6b5f1',
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
