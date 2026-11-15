import { expect, test, type Page } from '@playwright/test';

async function recordEffects(page: Page) {
  await page.addInitScript(() => {
    window.AudioContext = class extends AudioContext {
      constructor() {
        super({ sinkId: { type: 'none' } } as AudioContextOptions);
      }
    };
    const effects: OscillatorType[] = [];
    Object.assign(window, { museumEffects: effects });
    const start = OscillatorNode.prototype.start;
    OscillatorNode.prototype.start = function (...args) {
      effects.push(this.type);
      start.apply(this, args);
    };
  });
  return () =>
    page.evaluate(() => (window as Window & { museumEffects?: OscillatorType[] }).museumEffects!);
}

test('plays a selection cue and footsteps only while the explorer is walking', async ({ page }) => {
  const effects = await recordEffects(page);
  await page.goto('/');
  const shell = page.locator('main.museum-shell');
  await expect(shell).toHaveAttribute('data-screen', 'welcome');
  expect(await effects()).toEqual([]);

  await page.keyboard.press('ArrowUp');
  await expect(shell).toHaveAttribute('data-screen', 'avatar');
  await expect.poll(effects).toEqual(['sine']);

  for (let step = 0; step < 4; step += 1) {
    await page.keyboard.press('ArrowUp');
    await page.evaluate(
      () =>
        new Promise<void>((resolve) =>
          requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
        ),
    );
  }
  await expect(shell).toHaveAttribute('data-screen', 'tutorial');
  const steps = async () => (await effects()).filter((effect) => effect === 'triangle').length;
  expect(await steps()).toBe(0);

  await page.keyboard.down('ArrowRight');
  try {
    await expect.poll(steps).toBeGreaterThanOrEqual(2);
  } finally {
    await page.keyboard.up('ArrowRight');
  }
  await page.waitForTimeout(50);
  const stopped = await steps();
  await page.waitForTimeout(450);
  expect(await steps()).toBe(stopped);
});

test.describe('touch selection', () => {
  test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });

  test('unlocks audio on the first native tap and plays one selection cue', async ({ page }) => {
    const effects = await recordEffects(page);
    await page.goto('/');
    const shell = page.locator('main.museum-shell');
    await expect(shell).toHaveAttribute('data-screen', 'welcome');
    expect(await effects()).toEqual([]);
    await page.getByRole('button', { name: 'Yes', exact: true }).tap();
    await expect(shell).toHaveAttribute('data-screen', 'avatar');
    await expect.poll(effects).toEqual(['sine']);
    await page.waitForTimeout(150);
    expect(await effects()).toEqual(['sine']);
  });
});
