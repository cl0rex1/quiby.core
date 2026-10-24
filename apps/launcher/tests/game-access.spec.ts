import { test, expect, boot } from './fixtures';

test('Minecraft closure preserves launcher content and session, shows message and recovers', async ({ page }, info) => {
  let closed = false;
  await page.route('**/api/game/access', route => route.fulfill({ json: { closed, message: 'Готовим мир к открытию сезона' } }));
  await boot(page);
  closed = true; await page.evaluate(() => window.dispatchEvent(new Event('focus')));
  await expect(page.getByRole('button', { name: 'Запуск Minecraft закрыт', exact: true })).toBeDisabled();
  await expect(page.getByRole('status').filter({ hasText: 'Готовим мир' })).toBeVisible();
  await expect(page.getByLabel('Контент', { exact: true })).toBeVisible();
  expect(await page.evaluate(() => !!localStorage.getItem('quiby_session'))).toBe(true);
  expect(await page.evaluate(() => (window as any).__test.calls.filter((c: any) => c.name === 'launchGame').length)).toBe(0);
  await page.screenshot({ path: info.outputPath('minecraft-closed.png') });
  closed = false; await page.getByRole('button', { name: 'Проверить доступ', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Запустить игру', exact: true })).toBeEnabled();
});

test('unknown Minecraft policy fails closed but leaves launcher browsing available', async ({ page }) => {
  let failed = true;
  await page.route('**/api/game/access', route => failed ? route.abort() : route.fulfill({ json: { closed: false } }));
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Проверка доступа', exact: true })).toBeDisabled();
  await expect(page.getByRole('status').filter({ hasText: 'Не удалось проверить доступ' })).toBeVisible();
  await expect(page.getByLabel('Контент', { exact: true })).toBeVisible();
  failed = false; await page.getByRole('button', { name: 'Проверить доступ', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Запустить игру', exact: true })).toBeEnabled();
});
