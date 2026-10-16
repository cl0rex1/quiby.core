import { test, expect, boot, content } from './fixtures';

test('cleared reviews stay cleared across polls and reloads; deleted mods never return', async ({ page }) => {
  const hash = 'a'.repeat(40);
  const reviews = [
    { hashSha1: hash, filename: 'current.jar', name: 'Current', stage: 'pending', message: 'Ожидаем решения.' },
    { hashSha1: 'b'.repeat(40), filename: 'deleted.jar', name: 'Deleted', stage: 'approved', message: 'Одобрено' },
    { hashSha1: 'c'.repeat(40), filename: 'deleted.zip', name: 'Old pack', stage: 'rejected', message: 'Отклонено' },
  ];
  await page.addInitScript(hash => {
    if (!localStorage.getItem('fixture-mods-initialized')) {
      localStorage.setItem('quiby_custom_mods', JSON.stringify([{ id: 'current', name: 'Current', filename: 'current.jar', hashSha1: hash, enabled: false, size: 10, safetyStatus: 'pending' }]));
      localStorage.setItem('fixture-mods-initialized', 'true');
    }
  }, hash);
  await page.route('**/api/mods/reviews/mine', async route => { await route.fulfill({ json: reviews }); });
  const settle = async () => page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
  const refreshReviews = async () => {
    const response = page.waitForResponse('**/api/mods/reviews/mine');
    await page.evaluate(() => window.dispatchEvent(new Event('focus')));
    await (await response).finished(); await settle();
  };
  const reload = async () => {
    const response = page.waitForResponse('**/api/mods/reviews/mine');
    await page.reload(); await (await response).finished(); await settle();
    await page.getByRole('button', { name: /^Почта/ }).click();
  };
  await boot(page);
  await page.getByRole('button', { name: /^Почта/ }).click();
  await expect(page.locator('.inbox-letter')).toHaveCount(1);
  await expect(page.locator('.inbox-letter')).toContainText('Current');
  await page.getByTitle('Очистить все', { exact: true }).click();
  await expect(page.locator('.inbox-letter')).toHaveCount(0);
  reviews[0].message = 'Другой текст того же статуса';
  await refreshReviews();
  await expect(page.locator('.inbox-letter')).toHaveCount(0);
  await reload();
  await expect(page.locator('.inbox-letter')).toHaveCount(0);

  // A real decision for a still-installed mod remains useful after clearing.
  reviews[0].stage = 'approved'; reviews[0].message = 'Решение: одобрено';
  await refreshReviews();
  await expect(page.locator('.inbox-letter')).toHaveCount(1);
  await expect(page.locator('.inbox-letter')).toContainText('Решение: одобрено');
  await page.locator('.inbox-letter').click();
  await page.getByRole('button', { name: 'Удалить уведомление', exact: true }).click();
  await refreshReviews();
  await expect(page.locator('.inbox-letter')).toHaveCount(0);

  // Removing the file makes even a subsequent status change irrelevant.
  await page.evaluate(() => localStorage.setItem('quiby_custom_mods', '[]'));
  reviews[0].stage = 'rejected'; reviews[0].message = 'Старое решение';
  await reload();
  await expect(page.locator('.inbox-letter')).toHaveCount(0);
});

test('photo viewer fits portrait images, zooms at the cursor, pans and resets on navigation', async ({ page }, info) => {
  await boot(page);
  await page.evaluate(() => {
    const api = (window as any).quibyApi;
    (window as any).quibyApi = new Proxy(api, { get(target, key) {
      if (key === 'getScreenshotImage') return async (_dir: string, name: string) => 'data:image/svg+xml,' + encodeURIComponent(
        `<svg xmlns="http://www.w3.org/2000/svg" width="${name === 'one.png' ? 1200 : 400}" height="${name === 'one.png' ? 1800 : 200}"><rect width="100%" height="100%" fill="#392744"/><circle cx="50%" cy="50%" r="100" fill="#bb8aee"/></svg>`);
      return Reflect.get(target, key);
    } });
  });
  await content(page, 'Скриншоты');
  await page.getByRole('button', { name: 'Открыть one.png', exact: true }).click();
  const canvas = page.locator('.photo-canvas');
  const image = page.locator('.photo-viewer-current');
  await expect(image).toBeVisible();
  const frame = (await canvas.boundingBox())!;
  const fitted = (await image.boundingBox())!;
  expect(fitted.height).toBeLessThanOrEqual(frame.height);
  expect(fitted.width).toBeLessThanOrEqual(frame.width);
  expect(Math.abs(fitted.width / fitted.height - 2 / 3)).toBeLessThan(.01);
  await page.mouse.move(frame.x + frame.width / 2, frame.y + frame.height / 2);
  await page.mouse.wheel(0, -600);
  await expect(page.locator('.photo-viewer-stage')).toHaveClass(/is-zoomed/);
  await expect.poll(async () => (await image.boundingBox())!.height).toBeGreaterThan(frame.height);
  const beforeDrag = (await image.boundingBox())!;
  await page.mouse.down(); await page.mouse.move(frame.x + frame.width / 2, frame.y + frame.height / 2 + 90, { steps: 5 }); await page.mouse.up();
  await expect.poll(async () => (await image.boundingBox())!.y).toBeGreaterThan(beforeDrag.y + 50);
  await page.screenshot({ path: info.outputPath('photo-zoom-pan.png') });
  await page.getByRole('button', { name: 'Вписать в окно', exact: true }).click();
  await expect(page.locator('.photo-viewer-stage')).not.toHaveClass(/is-zoomed/);
  await page.getByRole('button', { name: 'Масштаб изображения', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Масштаб изображения', exact: true })).toHaveText('100%');
  await page.getByRole('button', { name: 'Следующий', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'two.png', exact: true })).toBeVisible();
  await expect(page.locator('.photo-viewer-stage')).not.toHaveClass(/is-zoomed/);
  await expect.poll(async () => (await image.boundingBox())!.width).toBe(400);
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
});

test('pack logos occupy their container without clipping or offset', async ({ page }) => {
  await boot(page);
  await page.evaluate(() => {
    const image = 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80"><rect width="80" height="80" fill="#b79767"/></svg>');
    (window as any).__test.files['resourcepacks:fixture-game'] = [{ filename: 'Low Shield.zip', size: 10, updatedAt: 1000, isAllowed: true, official: false, status: 'approved', iconUrl: image }];
    (window as any).__test.files['shaderpacks:fixture-game'] = [{ filename: 'shader.zip', name: 'shader.zip', size: 10, updatedAt: 1000, iconUrl: image }];
  });
  for (const category of ['Ресурспаки', 'Шейдеры']) {
    await content(page, category);
    await expect(page.locator('.pack-logo img')).toBeVisible();
    const boxes = await page.locator('.library-file-icon:has(.pack-logo)').evaluate(element => {
      const box = element.getBoundingClientRect(), image = element.querySelector('img')!.getBoundingClientRect();
      return { x: box.x - image.x, y: box.y - image.y, width: box.width - image.width, height: box.height - image.height };
    });
    expect(boxes).toEqual({ x: 0, y: 0, width: 0, height: 0 });
  }
});
