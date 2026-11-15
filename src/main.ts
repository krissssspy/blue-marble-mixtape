import { createBrowserPlayer, type BrowserPlayback } from './audio/browser-player.js';
import { exhibitScore } from './audio/exhibit-scores.js';
import { decodeFeaturePack } from './audio/feature-pack.js';
import { labScore } from './audio/lab-score.js';
import { DEFAULT_RECIPE, type Recipe } from './audio/recipe.js';
import { createMuseumAnnouncements } from './engine/announcements.js';
import { createArtifactInteraction, interactWithArtifacts } from './engine/artifact-interaction.js';
import { drawArtifactFrame } from './engine/artifact-frame.js';
import { drawAvatarScreen, drawExplorer, walkPose } from './engine/avatar-render.js';
import { loadAvatar, saveAvatar } from './engine/avatar-storage.js';
import { AVATAR_STEPS } from './engine/avatar.js';
import { cameraLeft } from './engine/camera.js';
import { createCanvasPresenter } from './engine/display.js';
import { createLinerNotes } from './engine/credits.js';
import { drawFarewell } from './engine/farewell.js';
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
import { drawLab, drawLabInvite, labChoice } from './engine/lab-render.js';
import { encodeLabShare, readLabShare } from './engine/lab-share.js';
import { createLabState, LAB_STEPS, stepLab, type LabState } from './engine/lab.js';
import { drawListenPrompt } from './engine/listen-prompt.js';
import { createListeningImage } from './engine/listening-image.js';
import { drawListeningOverlay } from './engine/listening-overlay.js';
import { motionFrame } from './engine/motion-preference.js';
import {
  loadMuseumAssets,
  type CatalogArtifact,
  type MuseumCatalog,
} from './engine/museum-assets.js';
import { createMuseumState, stepMuseum } from './engine/museum-state.js';
import { drawPlayhead, fitImageRect } from './engine/playhead.js';
import { tutorialExitOpen, walkRoom } from './engine/room-travel.js';
import { drawTapeLoader } from './engine/tape-loader.js';
import { createTouchControls } from './engine/touch-controls.js';
import { configureTouchLayout } from './engine/touch-layout.js';
import { drawTutorial } from './engine/tutorial-render.js';
import { drawWelcome } from './engine/welcome.js';
import { createMuseumRooms, drawDoor, drawRoom, type MuseumRoom } from './museum-rooms.js';
import { loadMuseumThumbnail } from './museum-thumbnails.js';
import { ACCESSIBILITY_STRINGS, APP_STRINGS, CREDITS_COPY, MUSEUM_ROOMS } from './strings.js';

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
  const credits = createLinerNotes(document);
  stage.append(credits.element);
  shell.append(touch, announcements.liveRegion);
  configureTouchLayout(shell, touch, navigator.maxTouchPoints);

  let storage: Storage | null = null;
  try {
    storage = window.localStorage;
  } catch {
    // The explorer still works when storage is unavailable.
  }
  let state = { ...createMuseumState(), avatar: loadAvatar(storage) };
  let catalog: MuseumCatalog | null = null;
  let rooms = createMuseumRooms();
  let position = { roomIndex: 0, x: 32 };
  let movingSteps = 0;
  let farewell = false;
  let creditIndex: number | null = null;
  let lab: LabState | null = null;
  let labPlaying = false;
  let interaction = createArtifactInteraction();
  let loadStarted = false;
  let loadFailed = false;
  let progress = 0;
  let practiceThumbnail: Uint8Array = thumbnailFallback;
  let currentImage: { id: string; element: HTMLImageElement } | null = null;
  let audio: {
    player: ReturnType<typeof createBrowserPlayer>;
    ready: Promise<boolean>;
  } | null = null;
  let listeningRequest: AbortController | null = null;
  let playback: BrowserPlayback | null = null;
  const thumbnails = new Map<string, Uint8Array>();
  const requestedThumbnails = new Set<string>();
  let tick = 0;
  let previousTime: number | undefined;

  function unlockAudio(): void {
    if (audio || typeof AudioContext === 'undefined') return;
    try {
      const player = createBrowserPlayer(new AudioContext());
      const ready = player.unlock().then(
        () => true,
        () => {
          audio = null;
          return false;
        },
      );
      audio = { player, ready };
    } catch {
      // The museum remains navigable if the browser cannot create an audio context.
    }
  }

  function loadListeningAudio(
    artifact: CatalogArtifact,
    room: MuseumRoom['id'],
    recipe: Recipe = DEFAULT_RECIPE,
  ): void {
    if (!audio) return;
    const { player, ready } = audio;
    const request = new AbortController();
    listeningRequest = request;
    void ready
      .then(async (unlocked) => {
        if (!unlocked || request.signal.aborted) return;
        const response = await fetch(artifact.mediaPaths.features, { signal: request.signal });
        if (!response.ok) return;
        const pack = decodeFeaturePack(await response.arrayBuffer());
        if (!request.signal.aborted) {
          const score =
            room === 'tutorial' || room === 'lab'
              ? labScore(pack, recipe)
              : exhibitScore(room, pack);
          playback = player.play(score);
        }
      })
      .catch(() => {
        // Keep the image and navigation responsive when audio or the pack is unavailable.
      });
  }

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
        catalog = assets.catalog;
        rooms = createMuseumRooms(assets);
        practiceThumbnail = assets.practiceThumbnail;
        thumbnails.set(assets.practiceArtifact.id, practiceThumbnail);
        const shared = readLabShare(window.location.hash);
        if (shared) {
          const artifactIndex = catalog.artifacts.findIndex(({ id }) => id === shared.artifactId);
          if (artifactIndex >= 0) {
            const roomIndex = rooms.length - 1;
            position = { roomIndex, x: rooms[roomIndex].walkway[0].x + 8 };
            lab = { step: LAB_STEPS.length - 1, artifactIndex, recipe: shared.recipe };
          }
        }
      })
      .catch(() => {
        loadFailed = true;
        loadStarted = false;
      });
  }

  function thumbnailFor(artifact: CatalogArtifact): Uint8Array {
    const { id } = artifact;
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
    if (creditIndex !== null && catalog) {
      const count = catalog.artifacts.length;
      if (sample.pressed.includes('no')) {
        creditIndex = null;
        input.clear();
      } else if (sample.pressed.includes('left')) {
        creditIndex = (creditIndex + count - 1) % count;
      } else if (sample.pressed.includes('right')) {
        creditIndex = (creditIndex + 1) % count;
      }
      return;
    }
    if (farewell) {
      if (sample.pressed.includes('no')) {
        farewell = false;
        position = { ...position, x: position.x - 12 };
        input.clear();
      } else if (sample.pressed.includes('yes') && catalog?.artifacts.length) {
        creditIndex = 0;
      }
      return;
    }
    if (lab && catalog) {
      if (labPlaying) {
        if (sample.pressed.includes('no')) labPlaying = false;
      } else {
        const choice = stepLab(lab, sample.pressed, catalog.artifacts.length);
        lab = choice.state;
        if (choice.effect === 'close') {
          lab = null;
          input.clear();
        } else if (choice.effect === 'play') {
          labPlaying = true;
          const artifactId = catalog.artifacts[lab.artifactIndex].id;
          window.history.replaceState(null, '', encodeLabShare({ artifactId, recipe: lab.recipe }));
        }
      }
      return;
    }
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
      const room = rooms[position.roomIndex];
      if (
        room.id === 'lab' &&
        sample.right &&
        !sample.left &&
        position.x === room.walkway.at(-1)!.x
      ) {
        farewell = true;
        movingSteps = 0;
        input.clear();
        return;
      }
    }
    movingSteps = position.x === previousX ? 0 : movingSteps + 1;
    if (previousRoom !== position.roomIndex) interaction = createArtifactInteraction();
    const room = rooms[position.roomIndex];
    if (
      room.id === 'lab' &&
      catalog &&
      interaction.listeningId === null &&
      interaction.promptId === null &&
      sample.pressed.includes('yes')
    ) {
      lab = createLabState();
      movingSteps = 0;
      return;
    }
    interaction = interactWithArtifacts(interaction, position.x, room.spots, sample.pressed);
  }

  function drawListening(artifact: CatalogArtifact, room: MuseumRoom['id'], recipe?: Recipe): void {
    if (currentImage?.id !== artifact.id) {
      const element = createListeningImage(document, artifact);
      currentImage = { id: artifact.id, element };
      imageHost.replaceChildren(element);
      imageHost.hidden = false;
      loadListeningAudio(artifact, room, recipe);
    }
    const { naturalWidth, naturalHeight } = currentImage.element;
    const playing = playback?.read();
    clearFramebuffer(frame, transparentIndex);
    const image = fitImageRect(frame.width, frame.height, naturalWidth, naturalHeight);
    if (image) {
      drawPlayhead(frame, image, playing?.activeEvents.map(({ location }) => location) ?? []);
    }
    drawListeningOverlay(
      frame,
      {
        shortTitle: artifact.shortTitle,
        displayDate: artifact.displayDate,
        genre:
          MUSEUM_ROOMS.find(({ id }) => id === room)?.genre ??
          MUSEUM_ROOMS.find(({ id }) => id === artifact.room)?.genre ??
          APP_STRINGS.museum,
      },
      playing?.progress ?? 0,
    );
  }

  function hideListening(): void {
    if (!currentImage) return;
    listeningRequest?.abort();
    listeningRequest = null;
    audio?.player.stop();
    playback = null;
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
    credits.element.hidden = creditIndex === null;
    if (creditIndex !== null && catalog) {
      const artifact = catalog.artifacts[creditIndex];
      shell.dataset.screen = 'credits';
      credits.show(artifact, creditIndex, catalog.artifacts.length);
      announcements.update({ roomName: `${CREDITS_COPY.heading}. ${artifact.title}.` });
    } else if (farewell) {
      hideListening();
      shell.dataset.screen = 'farewell';
      drawFarewell(frame);
      announcements.update({ roomName: ACCESSIBILITY_STRINGS.farewell });
    } else if (lab && catalog) {
      if (labPlaying) {
        const artifact = catalog.artifacts[lab.artifactIndex];
        shell.dataset.screen = 'listening';
        drawListening(artifact, 'lab', lab.recipe);
        announcements.update({ listening: artifact });
      } else {
        hideListening();
        shell.dataset.screen = 'lab';
        drawLab(frame, lab, catalog.artifacts, thumbnailFor);
        const { title, value } = labChoice(lab, catalog.artifacts);
        announcements.update({ roomName: `${title}. ${value}.` });
      }
    } else if (listening) {
      shell.dataset.screen = 'listening';
      drawListening(listening.artifact, room.id);
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
            hasNext: true,
            thumbnailFor: ({ artifact }) => thumbnailFor(artifact),
          });
          if (room.id === 'lab' && !prompt) drawLabInvite(frame);
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
    if (event.repeat) return;
    if (event.isTrusted && action === 'yes') unlockAudio();
    input.press(`key:${event.key}`, action);
  });
  window.addEventListener('keyup', (event) => {
    if (mapKey(event.key)) input.release(`key:${event.key}`);
  });
  touch.addEventListener('pointerup', (event) => {
    if (event.isTrusted && event.pointerType === 'touch') unlockAudio();
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
