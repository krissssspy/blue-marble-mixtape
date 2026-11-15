import { expect, test, type Page } from '@playwright/test';

async function enterDemo(page: Page) {
  await page.goto('/');
  const shell = page.locator('main.museum-shell');
  await expect(shell).toHaveAttribute('data-screen', 'welcome');
  await page.keyboard.press('ArrowUp');
  await expect(shell).toHaveAttribute('data-screen', 'avatar');
  for (let step = 0; step < 4; step += 1) {
    await page.keyboard.press('ArrowUp');
    await page.evaluate(
      () =>
        new Promise<void>((resolve) =>
          requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
        ),
    );
  }
  await expect(shell).toHaveAttribute('data-room', 'tutorial');
  await page.waitForFunction(() => {
    const canvas = document.querySelector<HTMLCanvasElement>('.game-stage canvas');
    const pixel = canvas?.getContext('2d')?.getImageData(291, 69, 1, 1).data;
    return pixel?.[0] === 46 && pixel[1] === 196 && pixel[2] === 182;
  });
  return shell;
}

test('uses Shift and the arrows to fade between adjacent exhibits and clear the old artifact', async ({
  page,
}) => {
  await page.route('https://svs.gsfc.nasa.gov/**', (route) => route.abort());
  const shell = await enterDemo(page);
  const stage = page.locator('.game-stage');
  await page.keyboard.press('Shift+ArrowRight');
  await page.waitForFunction(() => {
    const stage = document.querySelector('.game-stage');
    if (!stage) return false;
    const opacity = Number(getComputedStyle(stage).opacity);
    return opacity > 0.02 && opacity < 0.9;
  });
  await expect(shell).toHaveAttribute('data-room', 'sea-level');
  await expect(stage).toHaveCSS('opacity', '1');
  await expect(page.locator('.museum-announcements')).toContainText('Listen to');
  await page.keyboard.press('ArrowUp');
  await expect(shell).toHaveAttribute('data-screen', 'listening');
  await expect(page.locator('.game-stage img')).toBeVisible();

  await page.keyboard.down('Shift');
  await page.keyboard.down('ArrowRight');
  await page.keyboard.down('ArrowRight');
  await page.keyboard.up('ArrowRight');
  await page.keyboard.up('Shift');
  await expect(shell).toHaveAttribute('data-room', 'air-quality');
  await expect(stage).toHaveCSS('opacity', '1');
  await expect(shell).toHaveAttribute('data-screen', 'room');
  await expect(page.locator('.game-stage img')).toHaveCount(0);
  await page.keyboard.press('Shift+ArrowLeft');
  await expect(shell).toHaveAttribute('data-room', 'sea-level');
});

test('jumps instantly with reduced motion and stops at the first exhibit', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const shell = await enterDemo(page);
  await page.keyboard.press('Shift+ArrowRight');
  await expect(shell).toHaveAttribute('data-room', 'sea-level');
  await expect(page.locator('.game-stage')).toHaveCSS('opacity', '1');
  await page.keyboard.press('Shift+ArrowLeft');
  await expect(shell).toHaveAttribute('data-room', 'sea-level');
  for (const room of [
    'air-quality',
    'biodiversity',
    'wildfires',
    'greenhouse-gases',
    'energy',
    'disasters',
    'water-resources',
    'agriculture',
    'lab',
  ]) {
    await page.keyboard.press('Shift+ArrowRight');
    await expect(shell).toHaveAttribute('data-room', room);
  }
  await page.keyboard.press('Shift+ArrowRight');
  await expect(shell).toHaveAttribute('data-room', 'lab');
  await expect(page.locator('.game-stage')).toHaveCSS('opacity', '1');
});
