import { readFileSync } from 'node:fs';
import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Locator, type Page } from '@playwright/test';
import { drawText, measureTextWidth } from '../src/engine/font.js';
import { createFramebuffer } from '../src/engine/framebuffer.js';
import { DUSK_PALETTE } from '../src/engine/palette.js';

const museum = 'main.museum-shell[data-screen][data-room]';
const gameCanvas = '.game-stage canvas';
const status = '.museum-announcements';
async function waitForFrames(page: Page, count: number): Promise<void> {
  await page.evaluate(async (frames) => {
    for (let frame = 0; frame < frames; frame += 1) {
      await new Promise<void>((resolve) => {
        requestAnimationFrame(() => resolve());
      });
    }
  }, count);
}

async function waitForLoaderText(canvas: Locator, text: string): Promise<void> {
  const width = measureTextWidth(text);
  const height = 16;
  const stencil = createFramebuffer();
  drawText(stencil, text, 0, 0, 1);
  const mask = Array.from({ length: height }, (_, row) =>
    Array.from(stencil.pixels.slice(row * stencil.width, row * stencil.width + width)),
  ).flat();
  await expect
    .poll(
      () =>
        canvas.evaluate(
          (element, { mask, width, height }) => {
            const game = element as HTMLCanvasElement;
            const context = game.getContext('2d');
            if (!context) return false;
            const rgba = context.getImageData(0, 0, game.width, game.height).data;
            const foreground = mask.indexOf(1);
            const background = mask.indexOf(0);
            for (let y = 4; y <= 78 - height; y += 1) {
              for (let x = 170; x <= 310 - width; x += 1) {
                const sample = (offset: number) => {
                  const column = x + (offset % width);
                  const row = y + Math.floor(offset / width);
                  const pixel = 4 * (row * game.width + column);
                  return (rgba[pixel] << 16) | (rgba[pixel + 1] << 8) | rgba[pixel + 2];
                };

                const ink = sample(foreground);
                const backing = sample(background);
                if (ink === backing) continue;
                if (mask.every((mark, offset) => sample(offset) === (mark ? ink : backing))) {
                  return true;
                }
              }
            }
            return false;
          },
          { mask, width, height },
        ),
      { message: `the tutorial loader visibly reads ${text}` },
    )
    .toBe(true);
}

async function holdRight(page: Page, until: () => Promise<void>): Promise<void> {
  await page.keyboard.down('ArrowRight');
  try {
    await until();
  } finally {
    await page.keyboard.up('ArrowRight');
  }
}

async function enterTutorial(page: Page, shell: Locator): Promise<void> {
  await page.keyboard.press('ArrowUp');
  await expect(shell).toHaveAttribute('data-screen', 'avatar');
  for (let choice = 0; choice < 4; choice += 1) {
    await page.keyboard.press('ArrowUp');
    await waitForFrames(page, 2);
  }
  await expect(shell).toHaveAttribute('data-screen', 'tutorial');
}

function readExplorerFeet(canvas: Locator): Promise<{ x: number; boots: string }> {
  return canvas.evaluate(
    (element, { shirt, boot }) => {
      const game = element as HTMLCanvasElement;
      const { data } = game.getContext('2d')!.getImageData(0, 0, game.width, game.height);
      function colorAt(x: number, y: number): number {
        const offset = 4 * (game.width * y + x);
        return (data[offset] << 16) | (data[offset + 1] << 8) | data[offset + 2];
      }
      const shirtLeft = Array.from({ length: game.width }, (_, x) => x).find(
        (x) => colorAt(x, 141) === shirt,
      );
      if (shirtLeft === undefined) throw new Error('The explorer is missing from the tutorial.');
      const x = shirtLeft + 5;
      const boots = [146, 147]
        .map((y) =>
          Array.from({ length: 12 }, (_, index) => Number(colorAt(x - 6 + index, y) === boot)).join(
            '',
          ),
        )
        .join('/');
      return { x, boots };
    },
    {
      shirt: Number.parseInt(DUSK_PALETTE[11].slice(1), 16),
      boot: Number.parseInt(DUSK_PALETTE[13].slice(1), 16),
    },
  );
}

test('walks from Welcome to the first exhibit with only arrow keys', async ({ page }) => {
  const catalog = JSON.parse(
    readFileSync(new URL('../public/catalog.json', import.meta.url), 'utf8'),
  ) as {
    artifacts: {
      id: string;
      altText: string;
      featured: boolean;
      fullResolution: { url: string } | null;
      mediaPaths: { preview: string };
    }[];
  };
  const eligible = catalog.artifacts.find(
    (artifact) => artifact.featured && artifact.fullResolution,
  );
  if (!eligible?.fullResolution) throw new Error('The catalog needs a featured NASA image.');
  const practice = eligible;
  const remoteUrl = eligible.fullResolution.url;
  const blocked: string[] = [];
  await page.route('**/catalog.json', (route) =>
    route.fulfill({
      json: {
        ...catalog,
        artifacts: [practice, ...catalog.artifacts.filter(({ id }) => id !== practice.id)],
      },
    }),
  );
  await page.route('https://svs.gsfc.nasa.gov/**', async (route) => {
    blocked.push(route.request().url());
    await route.abort('failed');
  });

  await page.goto('/');
  const shell = page.locator(museum);
  const canvas = page.locator(gameCanvas).first();
  const announcements = page.locator(status);
  await expect(shell).toHaveAttribute('data-screen', 'welcome');
  await expect(canvas).toBeVisible();
  for (const name of ['Walk left', 'Walk right', 'Yes', 'No']) {
    await expect(page.getByRole('button', { name, exact: true })).toBeHidden();
  }

  await enterTutorial(page, shell);
  await waitForLoaderText(canvas, 'READY');
  await expect
    .poll(() =>
      canvas.evaluate((element) => {
        const context = (element as HTMLCanvasElement).getContext('2d')!;
        return [
          [180, 8],
          [305, 28],
          [291, 69],
        ].map(([x, y]) => Array.from(context.getImageData(x, y, 1, 1).data));
      }),
    )
    .toEqual([
      [155, 246, 255, 255],
      [22, 33, 62, 255],
      [46, 196, 182, 255],
    ]);
  await holdRight(page, () => expect(announcements).toContainText(/listen/i));

  await page.keyboard.press('ArrowUp');
  await expect(shell).toHaveAttribute('data-screen', 'listening');
  const image = page.locator('.game-stage img').filter({ visible: true });
  await expect(image).toHaveAttribute('alt', practice.altText);
  await expect(image).toHaveAttribute('src', practice.mediaPaths.preview);
  await expect.poll(() => blocked).toContain(remoteUrl);
  await expect
    .poll(() => image.evaluate((element) => (element as HTMLImageElement).naturalWidth))
    .toBeGreaterThan(0);
  const audit = await new AxeBuilder({ page })
    .withRules(['image-alt', 'button-name', 'aria-valid-attr-value'])
    .analyze();
  expect(audit.violations).toEqual([]);

  await page.keyboard.press('ArrowDown');
  await expect(shell).toHaveAttribute('data-screen', 'tutorial');
  await expect(image).toBeHidden();
  await holdRight(page, () => expect(shell).toHaveAttribute('data-room', 'sea-level'));
});

test('retries the tutorial catalog with Up after the first request fails', async ({ page }) => {
  let attempts = 0;
  await page.route('**/catalog.json', (route) => {
    attempts += 1;
    if (attempts === 1) return route.fulfill({ status: 503, body: '' });
    return route.continue();
  });
  await page.goto('/');
  const shell = page.locator(museum);
  const canvas = page.locator(gameCanvas).first();
  await enterTutorial(page, shell);
  await expect(page.locator(status)).toContainText(/load failed/i);
  await waitForLoaderText(canvas, '↑ RETRY');
  expect(attempts).toBe(1);

  await page.keyboard.press('ArrowUp');
  await waitForLoaderText(canvas, 'READY');
  expect(attempts).toBe(2);
});

test('starts catalog audio and its image playhead after a gesture and stops on close', async ({
  page,
}) => {
  interface AudioProbe {
    started: { hasSignal: boolean; sampleRate: number; channels: number }[];
    durations: number[];
    stopped: number;
  }
  await page.addInitScript(() => {
    window.AudioContext = class extends AudioContext {
      constructor() {
        super({ sinkId: { type: 'none' } } as AudioContextOptions);
      }
    };
    Object.defineProperty(window, 'AudioWorkletNode', { value: undefined });
    const probe: AudioProbe = { started: [], durations: [], stopped: 0 };
    Object.assign(window, { audioProbe: probe });
    const nativeStart = AudioBufferSourceNode.prototype.start;
    const nativeStop = AudioBufferSourceNode.prototype.stop;
    AudioBufferSourceNode.prototype.start = function (...args) {
      const buffer = this.buffer!;
      probe.started.push({
        hasSignal:
          buffer.getChannelData(0).some((sample) => sample !== 0) ||
          buffer.getChannelData(1).some((sample) => sample !== 0),
        sampleRate: buffer.sampleRate,
        channels: buffer.numberOfChannels,
      });
      probe.durations.push(buffer.duration);
      nativeStart.apply(this, args);
    };
    AudioBufferSourceNode.prototype.stop = function (...args) {
      probe.stopped += 1;
      nativeStop.apply(this, args);
    };
  });
  const audio = () =>
    page.evaluate(() => (window as Window & { audioProbe?: AudioProbe }).audioProbe!);

  await page.route('https://svs.gsfc.nasa.gov/**', (route) => route.abort());
  await page.goto('/');
  const shell = page.locator(museum);
  const canvas = page.locator(gameCanvas).first();
  await expect(shell).toHaveAttribute('data-screen', 'welcome');
  expect((await audio()).started).toEqual([]);
  await enterTutorial(page, shell);
  await waitForLoaderText(canvas, 'READY');
  await holdRight(page, () => expect(page.locator(status)).toContainText(/listen/i));
  expect((await audio()).started).toEqual([]);

  const feature = page.waitForResponse((response) => response.url().endsWith('/features.bin'), {
    timeout: 5000,
  });
  await page.keyboard.press('ArrowUp');
  await expect(shell).toHaveAttribute('data-screen', 'listening');
  expect((await feature).ok()).toBe(true);
  await expect
    .poll(async () => (await audio()).started)
    .toEqual([{ hasSignal: true, sampleRate: 22050, channels: 2 }]);
  await expect
    .poll(() =>
      canvas.evaluate((element) => {
        const game = element as HTMLCanvasElement;
        const row = game.getContext('2d')!.getImageData(0, 90, game.width, 1).data;
        return row.some(
          (value, index) =>
            index % 4 === 0 &&
            value === 255 &&
            row[index + 1] === 204 &&
            row[index + 2] === 51 &&
            row[index + 3] === 255,
        );
      }),
    )
    .toBe(true);
  await page.keyboard.press('ArrowDown');
  await expect(shell).toHaveAttribute('data-screen', 'tutorial');
  await expect.poll(async () => (await audio()).stopped).toBe(1);

  await holdRight(page, () =>
    expect(shell).toHaveAttribute('data-room', 'sea-level', { timeout: 10000 }),
  );
  await holdRight(page, () => expect(page.locator(status)).toContainText(/listen/i));
  const exhibitFeature = page.waitForResponse((response) =>
    response.url().endsWith('/media/svs-media-479017-main/features.bin'),
  );
  await page.keyboard.press('ArrowUp');
  await expect(shell).toHaveAttribute('data-screen', 'listening');
  expect((await exhibitFeature).ok()).toBe(true);
  await expect.poll(async () => (await audio()).started).toHaveLength(2);
  const playback = await audio();
  expect(playback.started[1]).toEqual({ hasSignal: true, sampleRate: 22050, channels: 2 });
  expect(playback.durations[1]).toBeLessThan(playback.durations[0]);
  await page.keyboard.press('ArrowDown');
  await expect.poll(async () => (await audio()).stopped).toBe(2);
});

test('animates the explorer while walking and uses the standing pose for reduced motion', async ({
  page,
}) => {
  await page.goto('/');
  const shell = page.locator(museum);
  const canvas = page.locator(gameCanvas).first();
  await enterTutorial(page, shell);
  const standing = await readExplorerFeet(canvas);
  const strides = new Set<string>();
  await holdRight(page, () =>
    expect
      .poll(
        async () => {
          const walking = await readExplorerFeet(canvas);
          if (walking.x > standing.x && walking.boots !== standing.boots)
            strides.add(walking.boots);
          return strides.size;
        },
        { intervals: [25] },
      )
      .toBeGreaterThan(1),
  );
  await expect.poll(async () => (await readExplorerFeet(canvas)).boots).toBe(standing.boots);

  const stoppingPoint = (await readExplorerFeet(canvas)).x;
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.keyboard.down('ArrowLeft');
  try {
    await expect.poll(async () => (await readExplorerFeet(canvas)).x).toBeLessThan(stoppingPoint);
    expect((await readExplorerFeet(canvas)).boots).toBe(standing.boots);
  } finally {
    await page.keyboard.up('ArrowLeft');
  }
});

test('keeps the Welcome canvas still with reduced motion', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  const canvas = page.locator(gameCanvas).first();
  await expect(canvas).toBeVisible();
  await expect
    .poll(() =>
      canvas.evaluate(
        (element) =>
          (element as HTMLCanvasElement).getContext('2d')?.getImageData(160, 100, 1, 1).data[3],
      ),
    )
    .toBe(255);
  const readFrame = () => canvas.evaluate((element) => (element as HTMLCanvasElement).toDataURL());
  const still = await readFrame();

  await waitForFrames(page, 18);
  expect(await readFrame()).toBe(still);

  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await expect.poll(readFrame).not.toBe(still);
});

test.describe('portrait touch device', () => {
  const viewport = { width: 390, height: 844 };
  test.use({ viewport, isMobile: true, hasTouch: true });

  test('places 48px touch buttons below the portrait canvas and starts with a native tap', async ({
    page,
  }) => {
    await page.goto('/');
    const canvas = page.locator(gameCanvas).first();
    const stage = page.locator('.game-stage');
    await expect(canvas).toBeVisible();
    const stageBox = await stage.boundingBox();
    expect(stageBox).not.toBeNull();
    expect(stageBox!.y + stageBox!.height).toBeLessThanOrEqual(viewport.height / 2 + 1);

    for (const [name, side] of [
      ['Walk left', 'left'],
      ['Walk right', 'left'],
      ['Yes', 'right'],
      ['No', 'right'],
    ]) {
      const button = page.getByRole('button', { name, exact: true });
      await expect(button).toBeVisible();
      const box = await button.boundingBox();
      expect(box).not.toBeNull();
      expect(box!.width, name).toBeGreaterThanOrEqual(48);
      expect(box!.height, name).toBeGreaterThanOrEqual(48);
      expect(box!.y, name).toBeGreaterThanOrEqual(viewport.height / 2 - 1);
      if (side === 'left')
        expect(box!.x + box!.width, name).toBeLessThanOrEqual(viewport.width / 2);
      else expect(box!.x, name).toBeGreaterThanOrEqual(viewport.width / 2);
    }

    await page.getByRole('button', { name: 'Yes', exact: true }).tap();
    await expect(page.locator(museum)).toHaveAttribute('data-screen', 'avatar');
  });
});
