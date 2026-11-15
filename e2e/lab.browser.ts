import { expect, test } from '@playwright/test';
import { DEFAULT_RECIPE } from '../src/audio/recipe.js';
import { encodeLabShare, readLabShare } from '../src/engine/lab-share.js';
import { LAB_STEPS } from '../src/engine/lab.js';

test('reopens an unmounted catalog artifact from a share link, edits the mix, and plays it', async ({
  page,
}) => {
  const artifactId = 'svs-page-2008-365262';
  const mix = {
    artifactId,
    recipe: { ...DEFAULT_RECIPE, scan: 'spiral', voice: 'bell', tempo: 'fast' } as const,
  };
  await page.addInitScript(() => {
    Object.defineProperty(window, 'AudioWorkletNode', { value: undefined });
    const start = AudioBufferSourceNode.prototype.start;
    AudioBufferSourceNode.prototype.start = function (...args) {
      const hasSignal = this.buffer!.getChannelData(0).some((sample) => sample !== 0);
      Object.assign(window, { labHasSignal: hasSignal });
      start.apply(this, args);
    };
  });
  await page.goto('/' + encodeLabShare(mix));
  const shell = page.locator('main.museum-shell');
  const status = page.locator('.museum-announcements');

  await page.keyboard.press('ArrowUp');
  await expect(shell).toHaveAttribute('data-screen', 'avatar');
  for (let choice = 0; choice < 4; choice += 1) {
    await page.keyboard.press('ArrowUp');
    await page.evaluate(
      () =>
        new Promise<void>((resolve) => {
          requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
        }),
    );
  }
  await expect(shell).toHaveAttribute('data-room', 'lab');
  await expect(shell).toHaveAttribute('data-screen', 'lab');
  await expect(status).toContainText('PLAY?');

  await page.keyboard.press('ArrowDown');
  await expect(status).toContainText('TEMPO');
  await expect(status).toContainText('FAST');
  await page.keyboard.press('ArrowRight');
  await expect(status).toContainText('SLOW');
  await page.keyboard.press('ArrowUp');
  await expect(status).toContainText('PLAY?');

  const pack = page.waitForResponse((response) =>
    response.url().endsWith(`/media/${artifactId}/features.bin`),
  );
  await page.keyboard.press('ArrowUp');
  await expect(shell).toHaveAttribute('data-screen', 'listening');
  expect((await pack).ok()).toBe(true);
  await expect(page.locator('.game-stage img')).toBeVisible();
  await expect
    .poll(() => page.evaluate(() => (window as Window & { labHasSignal?: boolean }).labHasSignal))
    .toBe(true);
  expect(readLabShare(new URL(page.url()).hash)).toEqual({
    artifactId,
    recipe: { ...mix.recipe, tempo: 'slow' },
  });
  await page.keyboard.press('ArrowDown');
  await expect(shell).toHaveAttribute('data-screen', 'lab');
  await expect(status).toContainText('PLAY?');
});

test.describe('touch controls', () => {
  test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });

  test('plays a shared mix through a native worklet and reaches the source credits', async ({
    page,
  }) => {
    interface AudioProbe {
      analyser?: AnalyserNode;
      workletStarts: number;
      workletStops: number;
      bufferStarts: number;
    }
    await page.addInitScript(() => {
      window.AudioContext = class extends AudioContext {
        constructor() {
          // Drive the native audio graph without depending on the host's playback device.
          super({ sinkId: { type: 'none' } } as AudioContextOptions);
        }
      };
      const probe: AudioProbe = { workletStarts: 0, workletStops: 0, bufferStarts: 0 };
      Object.assign(window, { workletProbe: probe });
      window.AudioWorkletNode = class extends AudioWorkletNode {
        constructor(context: BaseAudioContext, name: string, options?: AudioWorkletNodeOptions) {
          super(context, name, options);
          const analyser = context.createAnalyser();
          analyser.fftSize = 256;
          super.connect(analyser);
          probe.analyser = analyser;
          this.port.addEventListener('message', ({ data }) => {
            if ('startedAt' in data) probe.workletStarts += 1;
          });
        }
        override disconnect(): void {
          super.disconnect();
          probe.workletStops += 1;
        }
      };
      const nativeStart = AudioBufferSourceNode.prototype.start;
      AudioBufferSourceNode.prototype.start = function (...args) {
        probe.bufferStarts += 1;
        nativeStart.apply(this, args);
      };
    });
    const liveAudio = () =>
      page.evaluate(() => {
        const probe = (window as Window & { workletProbe?: AudioProbe }).workletProbe!;
        const samples = new Float32Array(256);
        probe.analyser?.getFloatTimeDomainData(samples);
        return {
          audible: samples.some((sample) => Math.abs(sample) > 0.001),
          workletStarts: probe.workletStarts,
          workletStops: probe.workletStops,
          bufferStarts: probe.bufferStarts,
        };
      });
    await page.goto(
      '/' +
        encodeLabShare({
          artifactId: 'svs-page-2008-365262',
          recipe: { ...DEFAULT_RECIPE, scan: 'spiral', voice: 'bell' },
        }),
    );
    const shell = page.locator('main.museum-shell');
    const yes = page.getByRole('button', { name: 'Yes' });
    const no = page.getByRole('button', { name: 'No' });
    await yes.tap();
    await expect(shell).toHaveAttribute('data-screen', 'avatar');
    for (let choice = 0; choice < 4; choice += 1) await yes.tap();
    await expect(shell).toHaveAttribute('data-screen', 'lab');
    expect(await liveAudio()).toMatchObject({ workletStarts: 0, bufferStarts: 0 });

    await yes.tap();
    await expect(shell).toHaveAttribute('data-screen', 'listening');
    await expect(page.locator('.game-stage img')).toBeVisible();
    await expect
      .poll(liveAudio)
      .toMatchObject({ audible: true, workletStarts: 1, bufferStarts: 0 });
    await no.tap();
    await expect(shell).toHaveAttribute('data-screen', 'lab');
    await expect.poll(liveAudio).toMatchObject({ workletStops: 1 });

    for (let step = 0; step < LAB_STEPS.length; step += 1) await no.tap();
    await expect(shell).toHaveAttribute('data-screen', 'room');
    const right = page.getByRole('button', { name: 'Walk right' });
    const box = (await right.boundingBox())!;
    const input = await page.context().newCDPSession(page);
    await input.send('Input.dispatchTouchEvent', {
      type: 'touchStart',
      touchPoints: [{ x: box.x + box.width / 2, y: box.y + box.height / 2 }],
    });
    try {
      await expect(shell).toHaveAttribute('data-screen', 'farewell', { timeout: 10000 });
    } finally {
      await input.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    }
    await yes.tap();
    const credits = page.getByRole('region', { name: 'Source credits' });
    await expect(credits).toBeVisible();
    const source = credits.getByRole('link');
    await expect(source).toHaveAttribute('href', /^https:\/\/[^/]*nasa\.gov\//);
    const title = await source.textContent();
    await right.tap();
    await expect(source).not.toHaveText(title!);
    await no.tap();
    await expect(shell).toHaveAttribute('data-screen', 'farewell');
  });
});
