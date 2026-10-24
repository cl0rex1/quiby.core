import { test, expect, boot, emit } from './fixtures';
import AxeBuilder from '@axe-core/playwright';

test('closed Minecraft can be preinstalled without launching, syncing skin or changing access', async ({ page }, info) => {
  await page.route('**/api/game/access', route => route.fulfill({ json: { closed: true, message: 'Сезон ещё не открыт. Скачайте сборку заранее.' } }));
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Запуск Minecraft закрыт', exact: true })).toBeDisabled();
  const preinstall = page.getByRole('button', { name: 'Предустановить Minecraft', exact: true });
  await expect(preinstall).toBeEnabled();
  await page.screenshot({ path: info.outputPath('preinstall-available.png') });
  await page.evaluate(() => { (window as any).__test.delays.preinstallGame = 1200; });
  await preinstall.click();
  await expect(page.getByRole('region', { name: 'Предустановка Minecraft' })).toBeVisible();
  await expect(page.getByText('Игра не запустится', { exact: false })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Предустановить Minecraft', exact: true })).toBeHidden();
  await page.screenshot({ path: info.outputPath('preinstall-progress.png') });
  await expect(page.locator('.launcher-toast').getByText('Minecraft предустановлен', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Запуск Minecraft закрыт', exact: true })).toBeDisabled();
  const calls = await page.evaluate(() => (window as any).__test.calls.map((c: any) => c.name));
  expect(calls.filter((name: string) => name === 'preinstallGame')).toHaveLength(1);
  expect(calls).not.toContain('launchGame');
  expect((await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze()).violations).toEqual([]);
});

test('preflight failure returns to home and makes preinstallation retryable', async ({ page }) => {
  await boot(page);
  await page.evaluate(() => { (window as any).__test.failures.preinstallGame = 'Нет связи с сервером'; });
  await page.getByRole('button', { name: 'Предустановить Minecraft', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Предустановить Minecraft', exact: true })).toBeEnabled();
  await expect(page.locator('.launcher-toast').getByText('Не удалось предустановить Minecraft', { exact: true })).toBeVisible();
  await page.evaluate(() => { delete (window as any).__test.failures.preinstallGame; });
  await page.getByRole('button', { name: 'Предустановить Minecraft', exact: true }).click();
  await expect(page.locator('.launcher-toast').getByText('Minecraft предустановлен', { exact: true })).toBeVisible();
});

test('preinstallation cannot be started while Minecraft is running', async ({ page }) => {
  await boot(page);
  await emit(page, 'onLaunchStateChange', { status: 'running', gamePid: 123 });
  await expect(page.getByRole('button', { name: 'Предустановить Minecraft', exact: true })).toBeHidden();
});
