import { drawArtifactFrame } from './engine/artifact-frame.js';
import { drawExplorer, type ExplorerPose } from './engine/avatar-render.js';
import type { AvatarSelection } from './engine/avatar.js';
import { drawExhibitBackdrop } from './engine/exhibit-backgrounds.js';
import { clearFramebuffer, fillRect, type Framebuffer } from './engine/framebuffer.js';
import type { CatalogArtifact, MuseumAssets } from './engine/museum-assets.js';
import { drawTrackBanner } from './engine/track-banner.js';
import { walkwayHeight } from './engine/walkway.js';
import { EXHIBIT_ARTIFACT_IDS, type ExhibitId } from './exhibit-selection.js';
import { APP_STRINGS, MUSEUM_ROOMS } from './strings.js';

const ground = 148;
const edge = 18;
const spacing = 88;

export interface MountedArtifact {
  readonly id: string;
  readonly x: number;
  readonly range: number;
  readonly artifact: CatalogArtifact;
}

export interface MuseumRoom {
  readonly id: ExhibitId | 'tutorial' | 'lab';
  readonly name: string;
  readonly width: number;
  readonly walkway: readonly { readonly x: number; readonly y: number }[];
  readonly spots: readonly MountedArtifact[];
}

const tutorialRoom: MuseumRoom = {
  id: 'tutorial',
  name: APP_STRINGS.tutorial,
  width: 320,
  walkway: [
    { x: edge, y: ground },
    { x: 320 - edge, y: ground },
  ],
  spots: [],
};

export function createMuseumRooms(assets?: MuseumAssets): readonly MuseumRoom[] {
  if (!assets) return [tutorialRoom];
  const tutorial = {
    ...tutorialRoom,
    spots: [
      { id: assets.practiceArtifact.id, x: 160, range: 27, artifact: assets.practiceArtifact },
    ],
  };
  const catalogById = new Map(assets.catalog.artifacts.map((artifact) => [artifact.id, artifact]));
  return [
    tutorial,
    ...MUSEUM_ROOMS.map(({ id, name }) => {
      const artifacts =
        id === 'lab'
          ? assets.catalog.artifacts.filter((artifact) => artifact.room === id)
          : EXHIBIT_ARTIFACT_IDS[id].flatMap((artifactId) => {
              const artifact = catalogById.get(artifactId);
              return artifact?.room === id ? [artifact] : [];
            });
      const width = Math.max(320, spacing * (artifacts.length + 1));
      return {
        id,
        name,
        width,
        walkway: [
          { x: edge, y: ground },
          { x: width - edge, y: ground },
        ],
        spots: artifacts.map((artifact, index) => ({
          id: artifact.id,
          x: spacing * (index + 1),
          range: 27,
          artifact,
        })),
      };
    }),
  ];
}

export function drawDoor(frame: Framebuffer, x: number, floor: number, open: boolean): void {
  const left = Math.round(x) - 10;
  fillRect(frame, left, floor - 40, 20, 40, 12);
  fillRect(frame, left + 3, floor - 37, 14, 37, open ? 0 : 13);
  if (open) fillRect(frame, left + 5, floor - 35, 10, 2, 4);
  else fillRect(frame, left + 13, floor - 19, 2, 2, 6);
}

function drawRoomBackdrop(
  frame: Framebuffer,
  room: MuseumRoom,
  offset: number,
  parallax: boolean,
): void {
  if (room.id === 'lab' || room.id === 'tutorial') {
    clearFramebuffer(frame, 0);
    fillRect(frame, 0, 55, frame.width, frame.height - 55, 1);
    const scroll = parallax ? Math.floor(offset / 4) % 48 : 0;
    for (let x = -scroll; x < frame.width; x += 48) {
      fillRect(frame, x, 73, 37, 75, 2);
      fillRect(frame, x + 4, 82, 29, 2, 3);
      fillRect(frame, x + 4, 106, 29, 2, 3);
    }
    fillRect(frame, 0, 129, frame.width, 2, 4);
  } else {
    drawExhibitBackdrop(frame, room.id, offset, parallax);
  }
  fillRect(frame, 0, ground, frame.width, frame.height - ground, 13);
  for (let x = -(Math.floor(offset) % 8); x < frame.width; x += 8) {
    for (let y = ground; y < frame.height; y += 8) {
      fillRect(frame, x, y + 1, 1, 7, 2);
      fillRect(frame, x + 2, y + 4, 4, 1, 14);
    }
  }
  fillRect(frame, 0, ground, frame.width, 2, 12);
}

type ArtifactFocus = NonNullable<Parameters<typeof drawArtifactFrame>[4]>;

interface RoomView {
  readonly room: MuseumRoom;
  readonly track: number;
  readonly left: number;
  readonly explorerX: number;
  readonly avatar: AvatarSelection;
  readonly pose?: ExplorerPose;
  readonly focusId: string | null;
  readonly focus: ArtifactFocus;
  readonly parallax: boolean;
  readonly hasNext: boolean;
  readonly thumbnailFor: (spot: MountedArtifact) => Uint8Array;
}

export function drawRoom(frame: Framebuffer, view: RoomView): void {
  const {
    room,
    track,
    left,
    explorerX,
    avatar,
    pose,
    focusId,
    focus,
    parallax,
    hasNext,
    thumbnailFor,
  } = view;
  drawRoomBackdrop(frame, room, left, parallax);
  drawDoor(frame, room.walkway[0].x - left, ground, true);
  if (hasNext) drawDoor(frame, room.walkway.at(-1)!.x - left, ground, true);

  for (const spot of room.spots) {
    const x = spot.x - left;
    if (x < -40 || x > frame.width + 40) continue;
    drawArtifactFrame(
      frame,
      x,
      walkwayHeight(room.walkway, spot.x),
      thumbnailFor(spot),
      spot.id === focusId ? focus : null,
    );
  }

  drawExplorer(frame, explorerX - left, walkwayHeight(room.walkway, explorerX), avatar, 1, pose);
  drawTrackBanner(frame, track, room.name);
}
