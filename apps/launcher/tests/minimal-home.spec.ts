import { test, expect, boot, content } from './fixtures';

test('minimal home uses build footage and corner information without a character canvas', async ({ page }, info) => {
  await page.setViewportSize({ width: 980, height: 620 }); await boot(page);
  await expect(page.locator('.home-build')).toContainText('Standard');
  await expect(page.locator('.home-build')).toContainText('6.0.0');
  await expect(page.getByLabel('Местное время')).toHaveText(/\d{2}:\d{2}/);
  await expect(page.locator('.home-scene canvas')).toHaveCount(0);
  await expect(page.locator('.home-scene-video')).toHaveAttribute('src', /standard/);
  expect(await page.locator('.home-scene-video').evaluate((video: HTMLVideoElement) => video.paused)).toBe(true);
  await page.screenshot({ path: info.outputPath('minimal-home.png') });
});

test('default names ignore old captions and cannot be edited', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('quiby_default_skin_captions', JSON.stringify({ Steve: 'Wrong', Alex: 'Wrong' })));
  await boot(page); await page.getByLabel('Гардероб', { exact: true }).click();
  for (const name of ['Steve', 'Alex']) {
    await page.locator('.skin-default-grid').getByRole('button', { name, exact: true }).click();
    await expect(page.getByTitle('Базовый скин')).toHaveText(name);
    await expect(page.getByTitle('Базовый скин')).toBeDisabled();
    await expect(page.getByTitle('Изменить название скина')).toHaveCount(0);
  }
});

test('viewer animations restore focus and reuse images without extra IPC reads', async ({ page }, info) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await boot(page); await content(page, 'Скриншоты');
  const card = page.getByRole('button', { name: 'Открыть one.png', exact: true });
  await card.click(); await expect(page.getByRole('dialog')).toBeVisible();
  await page.getByRole('button', { name: 'Следующий', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveAttribute('aria-label', 'two.png');
  await page.getByRole('button', { name: 'Предыдущий', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveAttribute('aria-label', 'one.png');
  await page.screenshot({ path: info.outputPath('minimal-viewer.png'), animations: 'disabled' });
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0); await expect(card).toBeFocused();
  expect(await page.evaluate(() => (window as any).__test.calls.filter((call: any) => call.name === 'getScreenshotImage' && call.args[1] === 'one.png' && call.args[2] === false).length)).toBe(1);
  await card.click(); await expect(page.getByRole('dialog')).toBeVisible();
  await page.keyboard.press('Escape'); await expect(page.getByRole('dialog')).toHaveCount(0);
  expect(await page.evaluate(() => (window as any).__test.calls.filter((call: any) => call.name === 'getScreenshotImage' && call.args[1] === 'one.png' && call.args[2] === false).length)).toBe(1);
});

test('pack logos display embedded images and recover from invalid ones', async ({ page }) => {
  await boot(page);
  await page.evaluate(() => {
    const iconUrl = 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32"><rect width="32" height="32" fill="green"/></svg>');
    (window as any).__test.files['shaderpacks:fixture-game'] = [{ name: 'Shader', filename: 'shader.zip', iconUrl, updatedAt: 1, size: 10 }];
    (window as any).__test.files['resourcepacks:fixture-game'] = [{ filename: 'pack.zip', iconUrl: 'data:image/png;base64,broken', updatedAt: 1, size: 10, official: true, isAllowed: true, status: 'approved' }];
  });
  await content(page, 'Шейдеры'); await expect(page.locator('.pack-logo img')).toBeVisible();
  await content(page, 'Ресурспаки'); await expect(page.locator('.pack-logo svg')).toBeVisible();
});
