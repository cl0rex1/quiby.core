import { test, expect, boot, emit } from './fixtures';

test('launch zoom finishes before a fast engine response replaces the home', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await boot(page);
  await page.evaluate(() => { (window as any).__test.delays.launchGame = 1800; });
  await page.getByRole('button', { name: 'Запустить игру', exact: true }).click();
  await expect(page.locator('.home-scene')).toHaveClass(/is-launching/);
  await expect.poll(() => page.evaluate(() => (window as any).__test.calls.filter((call: any) => call.name === 'launchGame').length)).toBe(1);
  await emit(page, 'onLaunchStateChange', { status: 'running' });
  await expect(page.locator('.home-scene')).toBeVisible();
  await expect(page.locator('.launch-experience')).toHaveCount(0);
  await expect.poll(() => page.locator('.home-scene-art').evaluate(element => new DOMMatrix(getComputedStyle(element).transform).a)).toBeGreaterThan(1.05);
  await expect(page.locator('.launch-experience')).toHaveAttribute('data-stage', '2');
  await expect(page.getByRole('button', { name: 'Остановить игру' })).toBeVisible();
});

test('preflight failure restores the home after zoom and preparation', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await boot(page);
  await page.evaluate(() => { (window as any).__test.delays.launchGame = 1600; });
  await page.getByRole('button', { name: 'Запустить игру', exact: true }).click();
  await expect(page.locator('.home-scene')).toHaveClass(/is-launching/);
  await expect(page.locator('.launch-experience')).toHaveAttribute('data-stage', '0');
  await expect(page.getByRole('alert')).toContainText('Сервер авторизации недоступен');
  await expect(page.locator('.home-scene')).toBeVisible();
  await expect(page.locator('.home-scene')).not.toHaveClass(/is-launching/);
  await expect(page.getByRole('button', { name: 'Запустить игру', exact: true })).toBeEnabled();
});

test('reduced motion skips the zoom and shows preparation immediately', async ({ page }) => {
  await boot(page);
  await page.evaluate(() => { (window as any).__test.delays.launchGame = 800; });
  await page.getByRole('button', { name: 'Запустить игру', exact: true }).click();
  await expect(page.locator('.home-scene')).toHaveCount(0);
  await expect(page.locator('.launch-experience')).toHaveAttribute('data-stage', '0');
  await expect(page.getByRole('alert')).toContainText('Сервер авторизации недоступен');
  await expect(page.getByRole('button', { name: 'Запустить игру', exact: true })).toBeEnabled();
});
