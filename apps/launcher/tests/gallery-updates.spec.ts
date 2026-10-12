import AxeBuilder from '@axe-core/playwright';
import { test, expect, boot, content, emit } from './fixtures';

test('an active skin outside the collection can be renamed and restored after reload', async ({ page }, info) => {
  await page.addInitScript(() => {
    const canvas = document.createElement('canvas'); canvas.width = canvas.height = 64;
    const ctx = canvas.getContext('2d')!; ctx.fillStyle = '#a96d8d'; ctx.fillRect(0, 0, 64, 64);
    localStorage.setItem('quiby_custom_skin_data', canvas.toDataURL('image/png'));
    localStorage.setItem('quiby_custom_skin_name', 'legacy-skin');
  });
  await boot(page); await page.getByLabel('Гардероб', { exact: true }).click();
  const source = await page.evaluate(() => localStorage.getItem('quiby_custom_skin_data'));
  await page.getByTitle('Изменить название скина').click();
  await page.getByRole('textbox', { name: 'Название скина', exact: true }).fill('Мой образ');
  await page.getByRole('button', { name: 'Сохранить', exact: true }).click();
  await expect(page.getByTitle('Изменить название скина')).toContainText('Мой образ');
  expect(await page.evaluate(() => localStorage.getItem('quiby_custom_skin_data'))).toBe(source);
  await page.screenshot({ path: info.outputPath('wardrobe-fallback.png') });
  await page.reload(); await page.getByLabel('Гардероб', { exact: true }).click();
  await expect(page.getByTitle('Изменить название скина')).toContainText('Мой образ');
  await page.getByTitle('Изменить название скина').click();
  await page.getByRole('textbox', { name: 'Название скина', exact: true }).fill('');
  await page.getByRole('button', { name: 'Сохранить', exact: true }).click();
  await expect(page.getByTitle('Изменить название скина')).toContainText('legacy-skin');
});

test('game lock covers the wardrobe and only mods and resourcepacks in content', async ({ page }, info) => {
  await boot(page); await emit(page, 'onLaunchStateChange', { status: 'running' });
  await page.getByLabel('Гардероб', { exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Гардероб доступен после игры' })).toBeVisible();
  expect(await page.locator('.game-content-lock-body').evaluate(element => (element as HTMLElement).inert)).toBe(true);
  await page.screenshot({ path: info.outputPath('wardrobe-locked.png') });
  for (const category of ['Моды', 'Ресурспаки', 'Шейдеры', 'Схематики', 'Скриншоты']) {
    await content(page, category);
    const locked = category === 'Моды' || category === 'Ресурспаки';
    await expect(page.locator('.game-content-lock-notice')).toHaveCount(locked ? 1 : 0);
    expect(await page.locator('.game-content-lock-body').evaluate(element => (element as HTMLElement).inert)).toBe(locked);
    if (category === 'Моды') await page.screenshot({ path: info.outputPath('mods-locked.png') });
  }
  await content(page, 'Моды'); await emit(page, 'onLaunchStateChange', { status: 'stopped' });
  await expect(page.locator('.game-content-lock-notice')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Добавить файл' })).toBeEnabled();
});

test('photo gallery groups, sorts, navigates, zooms and deletes screenshots', async ({ page }, info) => {
  await page.setViewportSize({ width: 980, height: 620 });
  await boot(page);
  await page.evaluate(() => {
    (window as any).__test.files['screenshots:fixture-game'] = [
      { name: 'new.png', size: 1800000, modifiedAt: Date.parse('2026-10-12T12:00:00Z') },
      { name: 'old.png', size: 900000, modifiedAt: Date.parse('2026-10-10T12:00:00Z') },
    ];
  });
  await content(page, 'Скриншоты');
  await expect(page.locator('.photo-day')).toHaveCount(2);
  await page.screenshot({ path: info.outputPath('screenshots.png') });
  await page.getByRole('combobox', { name: 'Порядок скриншотов' }).click();
  await page.getByRole('option', { name: 'Сначала старые' }).click();
  await expect(page.locator('.photo-card-open').first()).toHaveAttribute('aria-label', 'Открыть old.png');
  await page.getByRole('button', { name: 'Открыть old.png', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'old.png' })).toBeVisible();
  await page.getByRole('button', { name: 'Масштаб изображения' }).click();
  await expect(page.locator('.photo-viewer-stage')).toHaveClass(/is-zoomed/);
  await page.getByRole('button', { name: 'Показать new.png' }).click();
  await expect(page.getByRole('dialog', { name: 'new.png' })).toBeVisible();
  await page.screenshot({ path: info.outputPath('screenshot-viewer.png') });
  expect((await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze()).violations).toEqual([]);
  await page.getByRole('button', { name: 'Удалить', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.locator('.photo-card')).toHaveCount(1);
  await page.getByRole('button', { name: 'Выбрать все', exact: true }).click();
  await page.getByRole('toolbar').getByRole('button', { name: 'Удалить', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Здесь будут твои моменты' })).toBeVisible();
});

test('mail and floating notifications remain accessible with the new design', async ({ page }, info) => {
  await boot(page); await page.getByRole('button', { name: 'Запустить игру', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('Сервер авторизации недоступен');
  const bounds = await page.locator('.launcher-toast').boundingBox();
  expect(bounds!.y).toBe(48);
  await page.screenshot({ path: info.outputPath('notification-toast.png') });
  await page.getByRole('button', { name: 'Закрыть уведомление', exact: true }).click();
  await page.getByRole('button', { name: /^Почта/ }).click();
  await page.screenshot({ path: info.outputPath('mail.png') });
  expect((await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze()).violations).toEqual([]);
});
