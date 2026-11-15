import { readFileSync } from 'node:fs';
import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Locator, type Page } from '@playwright/test';
import { drawText, measureTextWidth } from '../src/engine/font.js';
import { createFramebuffer } from '../src/engine/framebuffer.js';

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
      { message: `the tutorial cassette visibly reads ${text}` },
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

  await page.keyboard.press('ArrowUp');
  await expect(shell).toHaveAttribute('data-screen', 'avatar');
  for (let choice = 0; choice < 4; choice += 1) {
    await page.keyboard.press('ArrowUp');
    await waitForFrames(page, 2);
  }

  await expect(shell).toHaveAttribute('data-screen', 'tutorial');
  await waitForLoaderText(canvas, 'READY');
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
  await page.keyboard.press('ArrowUp');
  await expect(shell).toHaveAttribute('data-screen', 'avatar');
  for (let choice = 0; choice < 4; choice += 1) {
    await page.keyboard.press('ArrowUp');
    await waitForFrames(page, 2);
  }
  await expect(shell).toHaveAttribute('data-screen', 'tutorial');
  await expect(page.locator(status)).toContainText(/load failed/i);
  await waitForLoaderText(canvas, '↑ RETRY');
  expect(attempts).toBe(1);

  await page.keyboard.press('ArrowUp');
  await waitForLoaderText(canvas, 'READY');
  expect(attempts).toBe(2);
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
