import AxeBuilder from '@axe-core/playwright';
import { test, expect, boot, content, emit } from './fixtures';

test('Java disclosure animates both directions and collapsed controls cannot receive focus', async ({ page }, info) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' }); await boot(page);
  await page.getByLabel('Настройки', { exact: true }).click();
  await page.getByRole('button', { name: 'Файлы и Java', exact: true }).click();
  const trigger = page.getByRole('button', { name: /Дополнительные параметры Java/ });
  await expect(trigger).toHaveAttribute('aria-expanded', 'false');
  const panel = page.locator('.jvm-options .disclosure-content');
  expect(await panel.evaluate(element => (element as HTMLElement).inert)).toBe(true);
  await trigger.click(); await expect(trigger).toHaveAttribute('aria-expanded', 'true');
  await expect(page.getByLabel('Ваши параметры JVM')).toBeVisible();
  expect(await page.locator('.jvm-options .disclosure-grid').evaluate(el => getComputedStyle(el).transitionDuration)).not.toBe('0s');
  await page.screenshot({ path: info.outputPath('java-expanded.png') });
  expect((await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze()).violations).toEqual([]);
  await trigger.click(); await expect(trigger).toHaveAttribute('aria-expanded', 'false');
  expect(await panel.evaluate(element => (element as HTMLElement).inert)).toBe(true);
});

test('selection actions animate and suspicious files belong to the unified Other filter', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' }); await boot(page); await content(page, 'Моды');
  await page.locator('input[type=file]').first().setInputFiles({ name: 'review.jar', mimeType: 'application/java-archive', buffer: Buffer.from('test') });
  await page.getByRole('combobox', { name: 'Категория модов' }).click();
  await page.getByRole('option', { name: 'Другое', exact: true }).click();
  const selection = page.getByRole('checkbox', { name: 'Выделить review.jar' });
  await expect(selection).toBeVisible(); await selection.click();
  const dock = page.getByRole('toolbar', { name: 'Управление выбранными файлами' });
  await expect(dock).toBeVisible();
  expect(await dock.evaluate(el => getComputedStyle(el).animationName)).not.toBe('none');
  await page.getByRole('button', { name: 'Снять выделение', exact: true }).click();
  await expect(page.locator('.content-selection-dock')).toHaveCount(0);
  await page.getByRole('combobox', { name: 'Категория модов' }).click();
  await page.getByRole('option', { name: 'Геймплей', exact: true }).click();
  await expect(selection).toHaveCount(0);
});

test('review uploads in background and a decision updates the same timeline card', async ({ page }, info) => {
  await boot(page); await content(page, 'Моды');
  await page.evaluate(() => { (window as any).__test.delays.uploadModReview = 1800; });
  await page.locator('input[type=file]').first().setInputFiles({ name: 'review.jar', mimeType: 'application/java-archive', buffer: Buffer.from('test') });
  await page.getByRole('button', { name: 'Подать заявку в вайтлист' }).click();
  await page.getByLabel('Описание / Назначение').fill('Мод для строительства и декора');
  await page.getByRole('button', { name: 'Отправить заявку', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.getByRole('button', { name: /^Почта/ }).click();
  const timeline = page.getByRole('list', { name: 'Статус заявки' });
  await expect(timeline).toHaveClass(/is-uploading/);
  await expect(timeline).toHaveClass(/is-pending/);
  await page.route('**/api/mods/reviews/mine', route => route.fulfill({ json: [{ hashSha1: 'a'.repeat(40), name: 'review.jar', filename: 'review.jar', stage: 'approved', message: 'Проверено администрацией' }] }));
  await page.evaluate(() => window.dispatchEvent(new Event('focus')));
  await expect(timeline).toHaveClass(/is-approved/);
  await expect(page.getByRole('button', { name: /Заявка: review.jar/ })).toHaveCount(1);
  await expect(page.getByRole('article').getByText('Проверено администрацией', { exact: true })).toBeVisible();
  await page.screenshot({ path: info.outputPath('review-timeline.png') });
  expect((await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze()).violations).toEqual([]);
});

test('game startup locks skin editing and ignores dropped skins until the game stops', async ({ page }) => {
  await page.addInitScript(() => {
    const canvas = document.createElement('canvas'); canvas.width = canvas.height = 64;
    localStorage.setItem('quiby_custom_skin_data', canvas.toDataURL());
    localStorage.setItem('quiby_custom_skin_name', 'custom.png');
  });
  await boot(page); await page.getByLabel('Гардероб', { exact: true }).click();
  await page.getByTitle('Изменить название скина').click();
  await emit(page, 'onLaunchStateChange', { status: 'starting' });
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByTitle('Изменить название скина')).toBeDisabled();
  await expect(page.locator('.wardrobe-controls input[type=file]')).toBeDisabled();
  await page.evaluate(() => {
    const transfer = new DataTransfer(); transfer.items.add(new File(['invalid'], 'skin.png', { type: 'image/png' }));
    window.dispatchEvent(new DragEvent('drop', { bubbles: true, cancelable: true, dataTransfer: transfer }));
  });
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await emit(page, 'onLaunchStateChange', { status: 'stopped' });
  await expect(page.getByTitle('Изменить название скина')).toBeEnabled();
});

test('interrupted review upload restores an actionable error instead of an endless spinner', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('fixture-notifications', JSON.stringify([{
    id: 'review-interrupted', title: 'Заявка: test.jar', timestamp: Date.now(), read: false,
    modInfo: { filename: 'test.jar', hashSha1: 'a'.repeat(40), reviewStage: 'uploading' },
  }])));
  await boot(page); await page.getByRole('button', { name: /^Почта/ }).click();
  await expect(page.getByRole('list', { name: 'Статус заявки' })).toHaveClass(/is-error/);
  await expect(page.getByRole('article').getByText(/Отправка прервана закрытием лаунчера/)).toBeVisible();
});

test('news waiting state is visible; broadcasts create one notification', async ({ page }) => {
  let releaseNews!: () => void;
  const pending = new Promise<void>(resolve => { releaseNews = resolve; });
  const article = { id: 'test-news', title: 'Новая встреча', excerpt: 'Краткое описание', content: 'Полное описание встречи на сервере', author: 'quiby', date: '2026-10-10T00:00:00Z', tag: 'event', broadcastRevision: 'revision-1' };
  await page.route('**/api/news', async route => { await pending; await route.fulfill({ json: [article] }); });
  await boot(page);
  await page.getByRole('button', { name: /^Почта/ }).click();
  await expect(page.getByRole('status')).toContainText('Загружаем новости');
  releaseNews();
  await expect(page.getByRole('button', { name: /Новая встреча/ })).toHaveCount(1);
  await page.getByRole('tab', { name: 'Новости', exact: true }).click();
  await expect(page.getByRole('article').getByText(article.content, { exact: true })).toBeVisible();
});

test('a queued file that was not delivered exposes a retry without reimporting it', async ({ page }) => {
  await boot(page); await content(page, 'Моды');
  await page.locator('input[type=file]').first().setInputFiles({ name: 'review.jar', mimeType: 'application/java-archive', buffer: Buffer.from('test') });
  await page.getByRole('button', { name: 'Подать заявку в вайтлист' }).click();
  await page.getByLabel('Описание / Назначение').fill('Дополнительный строительный мод');
  await page.getByRole('button', { name: 'Отправить заявку', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('quiby_custom_mods') || '[]')[0]?.safetyStatus)).toBe('pending');
  await page.evaluate(() => { (window as any).__test.failures.refreshCustomMod = 'offline'; });
  await page.route('**/api/mods/reviews/mine', route => route.fulfill({ json: [{ hashSha1: 'a'.repeat(40), name: 'review.jar', filename: 'review.jar', stage: 'error', message: 'Файл не доставлен. Повторите отправку.' }] }));
  await page.evaluate(() => window.dispatchEvent(new Event('focus')));
  await page.getByRole('button', { name: 'Повторить отправку заявки', exact: true }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
});
