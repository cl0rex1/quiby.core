import { test, expect, boot, content } from './fixtures';

test('Visual users must choose an available build before launching', async ({ page }) => {
  await boot(page);
  await page.evaluate(() => localStorage.setItem('fixture-settings', JSON.stringify({ modpackProfile: 'full' })));
  await page.reload();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toContainText('Visual временно недоступна');
  await expect(dialog.getByRole('tab')).toHaveCount(2);
  await expect(page.getByLabel('Закрыть выбор сборки')).toBeDisabled();
  await page.keyboard.press('Escape'); await expect(dialog).toBeVisible();
  await page.getByRole('button', { name: 'Выбрать Standard', exact: true }).click();
  await expect(dialog).not.toBeVisible();
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('fixture-settings') || '{}').modpackProfile)).toBe('optimal');
  await page.reload(); await expect(dialog).not.toBeVisible();
});

test('personal backgrounds apply to home and wardrobe and survive reload', async ({ page }, info) => {
  await page.route('quiby-media://**', route => route.fulfill({ contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="800"><rect width="1200" height="800" fill="#453258"/></svg>' }));
  await boot(page);
  await page.getByLabel('Настройки', { exact: true }).click();
  await page.getByRole('button', { name: 'Интерфейс', exact: true }).click();
  await page.getByRole('group', { name: 'Фон главной страницы' }).getByRole('button', { name: 'Без фона' }).click();
  await page.getByLabel('Главная', { exact: true }).click();
  await expect(page.locator('.home-scene-art img')).toHaveCount(0);
  await page.reload(); await expect(page.locator('.home-scene-art img')).toHaveCount(0);
  await page.getByLabel('Настройки', { exact: true }).click();
  await page.getByRole('button', { name: 'Интерфейс', exact: true }).click();
  for (const name of ['Фон главной страницы', 'Фон гардероба']) await page.getByRole('group', { name }).getByRole('button', { name: 'Свой фон' }).click();
  await page.getByLabel('Главная', { exact: true }).click();
  await expect(page.locator('.home-scene-art img')).toHaveAttribute('src', /\.gif.poster.png$/);
  await page.getByLabel('Гардероб', { exact: true }).click();
  await expect(page.locator('.scene-custom-background')).toHaveAttribute('src', /\.gif.poster.png$/);
  await page.screenshot({ path: info.outputPath('personal-backgrounds.png') });
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await expect(page.locator('.scene-custom-background')).toHaveAttribute('src', /\.gif$/);
});

test('copy feedback stays inside the photo viewer including errors', async ({ page }, info) => {
  await boot(page); await content(page, 'Скриншоты');
  await page.getByRole('button', { name: 'Открыть one.png', exact: true }).click();
  const viewer = page.getByRole('dialog');
  await viewer.getByRole('button', { name: 'Копировать', exact: true }).click();
  await expect(viewer.getByRole('status')).toHaveText('Скопировано');
  await expect(page.locator('.launcher-toast')).toHaveCount(0);
  await expect(viewer.getByTitle('Сбросить масштаб')).toBeVisible();
  await page.screenshot({ path: info.outputPath('photo-copy-feedback.png') });
  await page.evaluate(() => { (window as any).__test.failures.copyScreenshot = 'offline'; });
  await viewer.getByRole('button', { name: 'Копировать', exact: true }).click();
  await expect(viewer.getByRole('status')).toContainText('Не удалось скопировать');
});

test('rich news shows formatting, media and link previews safely', async ({ page }, info) => {
  await page.route('**/api/news', route => route.fulfill({ json: [{ id: 'rich', title: 'Открытие сезона', excerpt: 'Новости Quiby', author: 'quiby', date: '2026-10-21', tag: 'season', content: 'Rich content', contentHtml: '<h2>Встречаемся в игре</h2><p><strong>Сегодня</strong></p><ul><li>Новые приключения</li></ul><video src="https://example.com/movie.mp4" controls></video><a href="https://example.com/news">Подробности</a><a href="https://%">Bad URL</a><script>throw Error("unsafe")</script><iframe src="https://evil.example/"></iframe>' }] }));
  await page.route('**/api/news/link-preview?*', route => route.fulfill({ json: { title: 'Сезон VI', description: 'Большой мир', siteName: 'Quiby' } }));
  await boot(page); await page.getByRole('button', { name: /^Почта/ }).click();
  await expect(page.getByRole('heading', { name: 'Встречаемся в игре' })).toBeVisible();
  await expect(page.locator('.news-rich-content strong')).toHaveText('Сегодня');
  await expect(page.locator('.news-rich-content video')).toHaveAttribute('controls', '');
  await expect(page.locator('.news-link-preview')).toContainText('Сезон VI');
  await expect(page.locator('.news-rich-content iframe')).toHaveCount(0);
  await page.screenshot({ path: info.outputPath('rich-news.png') });
});
