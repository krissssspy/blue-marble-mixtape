import { expect, test } from '@playwright/test';
import { DEFAULT_RECIPE } from '../src/audio/recipe.js';
import { encodeLabShare, readLabShare } from '../src/engine/lab-share.js';

test('reopens an unmounted catalog artifact from a share link, edits the mix, and plays it', async ({
  page,
}) => {
  const artifactId = 'svs-page-2008-365262';
  const mix = {
    artifactId,
    recipe: { ...DEFAULT_RECIPE, scan: 'spiral', voice: 'bell', tempo: 'fast' } as const,
  };
  await page.addInitScript(() => {
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
