import { expect, test } from '@playwright/test';
import { EXHIBIT_ARTIFACT_IDS, type ExhibitId } from '../src/exhibit-selection.js';

interface AudibleClip {
  fingerprint: number;
  audible: boolean;
}

test('walks all nine exhibits, hears distinct scores, and reaches the thank-you door', async ({
  page,
}) => {
  test.setTimeout(60_000);
  await page.addInitScript(() => {
    window.AudioContext = class extends AudioContext {
      constructor() {
        super({ sinkId: { type: 'none' } } as AudioContextOptions);
      }
    };
    Object.defineProperty(window, 'AudioWorkletNode', { value: undefined });
    // Preserve trusted inputs and the native audio clock while shortening the walk.
    let first: number | undefined;
    const nativeFrame = window.requestAnimationFrame;
    window.requestAnimationFrame = (callback) =>
      nativeFrame((clock) => {
        first ??= clock;
        callback(first + (clock - first) * 6);
      });
    const clips: AudibleClip[] = [];
    Object.assign(window, { exhibitClips: clips });
    const nativeStart = AudioBufferSourceNode.prototype.start;
    AudioBufferSourceNode.prototype.start = function (...args) {
      const data = this.buffer!.getChannelData(0);
      let hash = 2166136261;
      let power = 0;
      for (let index = 0; index < data.length; index += 31) {
        const sample = data[index];
        hash = Math.imul(hash ^ Math.round(sample * 32768), 16777619);
        power += sample * sample;
      }
      clips.push({ fingerprint: hash >>> 0, audible: power > 0 });
      nativeStart.apply(this, args);
    };
  });

  const clips = () =>
    page.evaluate(() => (window as Window & { exhibitClips?: AudibleClip[] }).exhibitClips!);
  const listeningPrompt = () =>
    document.querySelector('.museum-announcements')?.textContent?.startsWith('Listen to ');
  const shell = page.locator('main.museum-shell');
  const renderedScenes = new Set<number>();
  const rooms = Object.keys(EXHIBIT_ARTIFACT_IDS) as ExhibitId[];

  await page.route('https://svs.gsfc.nasa.gov/**', (route) => route.abort());
  await page.goto('/');
  await expect(shell).toHaveAttribute('data-screen', 'welcome');
  await page.keyboard.press('ArrowUp');
  await expect(shell).toHaveAttribute('data-screen', 'avatar');
  for (let choice = 0; choice < 4; choice += 1) {
    await page.keyboard.press('ArrowUp');
    await page.evaluate(
      () =>
        new Promise<void>((resolve) => {
          requestAnimationFrame(() => resolve());
        }),
    );
  }
  await expect(shell).toHaveAttribute('data-screen', 'tutorial');
  expect(await clips()).toEqual([]);

  for (const [index, room] of rooms.entries()) {
    await page.keyboard.down('ArrowRight');
    try {
      await page.waitForFunction(
        (id) => document.querySelector('main.museum-shell')?.getAttribute('data-room') === id,
        room,
      );
    } finally {
      await page.keyboard.up('ArrowRight');
    }
    const scene = await page.locator('.game-stage canvas').evaluate((element) => {
      const canvas = element as HTMLCanvasElement;
      // Sample below the banner and above the artifact frames.
      const { data } = canvas.getContext('2d')!.getImageData(0, 58, canvas.width, 30);
      let hash = 2166136261;
      for (const value of data) hash = Math.imul(hash ^ value, 16777619);
      return hash >>> 0;
    });
    renderedScenes.add(scene);
    if (!(await page.evaluate(listeningPrompt))) {
      await page.keyboard.down('ArrowRight');
      try {
        await page.waitForFunction(listeningPrompt);
      } finally {
        await page.keyboard.up('ArrowRight');
      }
    }

    const artifact = EXHIBIT_ARTIFACT_IDS[room][0];
    const request = page.waitForResponse((response) =>
      response.url().endsWith(`/media/${artifact}/features.bin`),
    );
    await page.keyboard.press('ArrowUp');
    await expect(shell).toHaveAttribute('data-screen', 'listening');
    expect((await request).ok(), room).toBe(true);
    await expect(page.locator('.game-stage img')).toBeVisible();
    await expect.poll(async () => (await clips()).length).toBe(index + 1);
    expect((await clips()).at(-1)?.audible, room).toBe(true);
    await test.step(`draws the ${room} playhead over the image`, async () => {
      // Sample animation frames so that short attacks between assertion polls are visible.
      await page.waitForFunction(
        () => {
          const canvas = document.querySelector<HTMLCanvasElement>('.game-stage canvas')!;
          const { data } = canvas.getContext('2d')!.getImageData(0, 50, canvas.width, 73);
          for (let index = 0; index < data.length; index += 4) {
            if (
              data[index] === 255 &&
              data[index + 1] === 204 &&
              data[index + 2] === 51 &&
              data[index + 3] === 255
            )
              return true;
          }
          return false;
        },
        undefined,
        { timeout: 5000 },
      );
    });
    await page.keyboard.press('ArrowDown');
    await expect(shell).toHaveAttribute('data-screen', 'room');
  }

  expect(renderedScenes.size).toBe(9);
  expect(new Set((await clips()).map(({ fingerprint }) => fingerprint)).size).toBe(9);

  await page.keyboard.down('ArrowRight');
  try {
    await page.waitForFunction(
      () => document.querySelector('main.museum-shell')?.getAttribute('data-room') === 'lab',
    );
  } finally {
    await page.keyboard.up('ArrowRight');
  }
  await page.keyboard.press('ArrowUp');
  await expect(shell).toHaveAttribute('data-screen', 'lab');
  await expect(page.locator('.museum-announcements')).toContainText('ARTIFACT');
  await page.keyboard.press('ArrowLeft');
  await expect(page.locator('.museum-announcements')).toContainText('LANDSAT 7 LOOKS AT');
  await page.keyboard.press('ArrowDown');
  await expect(shell).toHaveAttribute('data-screen', 'room');

  await page.keyboard.down('ArrowRight');
  try {
    await expect(shell).toHaveAttribute('data-screen', 'farewell', { timeout: 7000 });
  } finally {
    await page.keyboard.up('ArrowRight');
  }
  await expect(page.locator('.museum-announcements')).toContainText(
    'I appreciate your visit to Overtone',
  );
  await page.keyboard.press('ArrowUp');
  await expect(shell).toHaveAttribute('data-screen', 'credits');
  const credits = page.getByRole('region', { name: 'Source credits' });
  await expect(credits).toBeVisible();
  const source = credits.getByRole('link');
  await expect(source).toHaveAttribute('href', /^https:\/\/[^/]*nasa\.gov\//);
  const firstTitle = await source.textContent();
  await expect(credits).toContainText('independent museum project');
  await page.keyboard.press('ArrowRight');
  await expect(source).not.toHaveText(firstTitle!);
  await expect(source).toHaveAttribute('href', /^https:\/\/[^/]*nasa\.gov\//);
  await page.keyboard.press('ArrowDown');
  await expect(shell).toHaveAttribute('data-screen', 'farewell');
  await page.keyboard.press('ArrowDown');
  await expect(shell).toHaveAttribute('data-room', 'lab');
  await expect(shell).toHaveAttribute('data-screen', 'room');
});
