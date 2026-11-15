import { createMuseumAnnouncements } from './engine/announcements.js';
import { createArtifactInteraction, interactWithArtifacts } from './engine/artifact-interaction.js';
import { drawArtifactFrame } from './engine/artifact-frame.js';
import { drawAvatarScreen, drawExplorer, walkPose } from './engine/avatar-render.js';
import { loadAvatar, saveAvatar } from './engine/avatar-storage.js';
import { AVATAR_STEPS } from './engine/avatar.js';
import { cameraLeft } from './engine/camera.js';
import { createCanvasPresenter } from './engine/display.js';
import { createFixedStepper } from './engine/fixed-step.js';
import { drawText } from './engine/font.js';
import {
  clearFramebuffer,
  createFramebuffer,
  fillRect,
  transparentIndex,
} from './engine/framebuffer.js';
import { createInputBuffer, type InputSample } from './engine/input-buffer.js';
import { mapKey } from './engine/input-map.js';
import { drawListenPrompt } from './engine/listen-prompt.js';
import { createListeningImage } from './engine/listening-image.js';
import { drawListeningOverlay } from './engine/listening-overlay.js';
import { motionFrame } from './engine/motion-preference.js';
import { loadMuseumAssets, type CatalogArtifact } from './engine/museum-assets.js';
import { createMuseumState, stepMuseum } from './engine/museum-state.js';
import { drawPlayhead, fitImageRect } from './engine/playhead.js';
import { tutorialExitOpen, walkRoom } from './engine/room-travel.js';
import { drawTapeLoader } from './engine/tape-loader.js';
import { createTouchControls } from './engine/touch-controls.js';
import { configureTouchLayout } from './engine/touch-layout.js';
import { drawTutorial } from './engine/tutorial-render.js';
import { drawWelcome } from './engine/welcome.js';
import { createMuseumRooms, drawDoor, drawRoom, type MountedArtifact } from './museum-rooms.js';
import { loadMuseumThumbnail } from './museum-thumbnails.js';
import { APP_STRINGS, MUSEUM_ROOMS } from './strings.js';

const thumbnailFallback = new Uint8Array(48 * 27).fill(3);
const secondsPerStep = 1 / 60;
const maxFrameGapMs = 250;

function mountMuseum(shell: HTMLElement, stage: HTMLElement, canvas: HTMLCanvasElement): void {
  const frame = createFramebuffer();
  const presenter = createCanvasPresenter(canvas, frame);
  const announcements = createMuseumAnnouncements(document, canvas);
  const input = createInputBuffer();
  const touch = createTouchControls(document, input);
  const motionPreference = matchMedia('(prefers-reduced-motion: reduce)');
  const imageHost = document.createElement('div');
  imageHost.className = 'listening-media';
  imageHost.hidden = true;
  stage.prepend(imageHost);
  shell.append(touch, announcements.liveRegion);
  configureTouchLayout(shell, touch, navigator.maxTouchPoints);

  let storage: Storage | null = null;
  try {
    storage = window.localStorage;
  } catch {
    // The explorer still works when storage is unavailable.
  }
  let state = { ...createMuseumState(), avatar: loadAvatar(storage) };
  let rooms = createMuseumRooms();
  let position = { roomIndex: 0, x: 32 };
  let movingSteps = 0;
  let interaction = createArtifactInteraction();
  let loadStarted = false;
  let loadFailed = false;
  let progress = 0;
  let practiceThumbnail: Uint8Array = thumbnailFallback;
  let currentImage: { id: string; element: HTMLImageElement } | null = null;
  const thumbnails = new Map<string, Uint8Array>();
  const requestedThumbnails = new Set<string>();
  let tick = 0;
  let previousTime: number | undefined;

  function loadTutorial(): void {
    if (loadStarted) return;
    loadStarted = true;
    loadFailed = false;
    void loadMuseumAssets(
      (path) => fetch(path),
      (path) => loadMuseumThumbnail(document, path),
      (value) => (progress = value),
    )
      .then((assets) => {
        rooms = createMuseumRooms(assets);
        practiceThumbnail = assets.practiceThumbnail;
        thumbnails.set(assets.practiceArtifact.id, practiceThumbnail);
      })
      .catch(() => {
        loadFailed = true;
        loadStarted = false;
      });
  }

  function thumbnailFor({ id, artifact }: MountedArtifact): Uint8Array {
    if (!requestedThumbnails.has(id) && !thumbnails.has(id)) {
      requestedThumbnails.add(id);
      void loadMuseumThumbnail(document, artifact.mediaPaths.thumbnail)
        .then((thumbnail) => thumbnails.set(id, thumbnail))
        .catch(() => {
          thumbnails.set(id, thumbnailFallback);
        });
    }
    return thumbnails.get(id) ?? thumbnailFallback;
  }

  function step(sample: InputSample): void {
    tick += 1;
    if (state.screen !== 'tutorial') {
      const transition = stepMuseum(state, sample);
      state = transition.state;
      if (transition.effect) shell.dispatchEvent(new Event(transition.effect));
      if (state.screen === 'tutorial') {
        saveAvatar(storage, state.avatar);
        loadTutorial();
      }
      return;
    }

    if (loadFailed && sample.pressed.includes('yes')) loadTutorial();
    const previousRoom = position.roomIndex;
    const previousX = position.x;
    if (interaction.listeningId === null) {
      position = walkRoom(position, sample, rooms, progress, secondsPerStep);
    }
    movingSteps = position.x === previousX ? 0 : movingSteps + 1;
    if (previousRoom !== position.roomIndex) interaction = createArtifactInteraction();
    const room = rooms[position.roomIndex];
    interaction = interactWithArtifacts(interaction, position.x, room.spots, sample.pressed);
  }

  function drawListening(artifact: CatalogArtifact): void {
    if (currentImage?.id !== artifact.id) {
      const element = createListeningImage(document, artifact);
      currentImage = { id: artifact.id, element };
      imageHost.replaceChildren(element);
      imageHost.hidden = false;
    }
    const { naturalWidth, naturalHeight } = currentImage.element;
    clearFramebuffer(frame, transparentIndex);
    const image = fitImageRect(frame.width, frame.height, naturalWidth, naturalHeight);
    if (image) drawPlayhead(frame, image, []);
    drawListeningOverlay(
      frame,
      {
        shortTitle: artifact.shortTitle,
        displayDate: artifact.displayDate,
        genre: MUSEUM_ROOMS.find(({ id }) => id === artifact.room)?.genre ?? APP_STRINGS.museum,
      },
      0,
    );
  }

  function hideListening(): void {
    if (!currentImage) return;
    imageHost.hidden = true;
    imageHost.replaceChildren();
    currentImage = null;
  }

  function renderMuseum(): void {
    const room = rooms[position.roomIndex];
    const listening = room.spots.find(({ id }) => id === interaction.listeningId);
    const prompt = room.spots.find(({ id }) => id === interaction.promptId);
    const motion = motionFrame(tick, motionPreference.matches);
    const pose = walkPose(movingSteps, motionPreference.matches);
    const focus = {
      tick: motion.backgroundTick,
      pulse: motion.pulse,
      sparkles: motion.sparkles,
    };

    shell.dataset.room = state.screen === 'tutorial' ? room.id : '';
    if (listening) {
      shell.dataset.screen = 'listening';
      drawListening(listening.artifact);
      announcements.update({ roomName: room.name, listening: listening.artifact });
    } else {
      hideListening();
      if (state.screen === 'welcome') {
        shell.dataset.screen = 'welcome';
        drawWelcome(frame, motion.backgroundTick);
        announcements.update({});
      } else if (state.screen === 'avatar') {
        shell.dataset.screen = 'avatar';
        const { key, choices } = AVATAR_STEPS[state.avatarStep];
        drawAvatarScreen(frame, state.avatar, state.avatarStep);
        announcements.update({ avatarChoice: choices[state.avatar[key]] });
      } else {
        const left = cameraLeft(position.x, room.width);
        if (position.roomIndex === 0) {
          shell.dataset.screen = 'tutorial';
          const floor = room.walkway[0].y;
          drawTutorial(frame, position.x, state.avatar, practiceThumbnail, pose);
          if (interaction.focusId !== null) {
            drawArtifactFrame(frame, 160, floor, practiceThumbnail, focus);
            drawExplorer(frame, position.x, floor, state.avatar, 1, pose);
          }
          drawDoor(frame, room.walkway.at(-1)!.x, floor, tutorialExitOpen(progress));
          drawTapeLoader(frame, progress);
          if (loadFailed) {
            fillRect(frame, 172, 5, 140, 41, 1);
            drawText(frame, APP_STRINGS.loadFailed, 176, 9, 5);
          }
        } else {
          shell.dataset.screen = 'room';
          drawRoom(frame, {
            room,
            track: position.roomIndex,
            left,
            explorerX: position.x,
            avatar: state.avatar,
            pose,
            focusId: interaction.focusId,
            focus,
            parallax: motion.parallax,
            hasNext: position.roomIndex < rooms.length - 1,
            thumbnailFor,
          });
        }
        if (prompt) drawListenPrompt(frame, prompt.x - left, 52);
        announcements.update({
          roomName: loadFailed ? APP_STRINGS.loadFailed : room.name,
          prompt: prompt?.artifact,
        });
      }
    }
    presenter.draw();
  }

  function resize(): void {
    presenter.resize(stage.clientWidth, stage.clientHeight);
    imageHost.style.left = canvas.style.left;
    imageHost.style.top = canvas.style.top;
    imageHost.style.width = canvas.style.width;
    imageHost.style.height = canvas.style.height;
  }

  window.addEventListener('keydown', (event) => {
    const action = mapKey(event.key);
    if (!action || event.altKey || event.metaKey || event.ctrlKey) return;
    event.preventDefault();
    if (!event.repeat) input.press(`key:${event.key}`, action);
  });
  window.addEventListener('keyup', (event) => {
    if (mapKey(event.key)) input.release(`key:${event.key}`);
  });
  function resetInput(): void {
    input.clear();
    movingSteps = 0;
    stepper = createFixedStepper(step);
    previousTime = undefined;
  }
  window.addEventListener('blur', resetInput);
  document.addEventListener('visibilitychange', resetInput);
  new ResizeObserver(resize).observe(stage);

  let stepper = createFixedStepper(step);
  function animate(now: number): void {
    const elapsed = previousTime === undefined ? 0 : Math.min(now - previousTime, maxFrameGapMs);
    previousTime = now;
    stepper.advance(elapsed, input.take());
    renderMuseum();
    requestAnimationFrame(animate);
  }

  resize();
  renderMuseum();
  requestAnimationFrame(animate);
}

const shell = document.querySelector<HTMLElement>('main.museum-shell');
const stage = shell?.querySelector<HTMLElement>('.game-stage');
const canvas = stage?.querySelector('canvas');
if (shell && stage && canvas) mountMuseum(shell, stage, canvas);
