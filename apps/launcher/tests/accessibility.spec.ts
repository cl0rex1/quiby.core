import AxeBuilder from '@axe-core/playwright';
import { test, expect, boot, content } from './fixtures';

for (const name of ['Главная', 'Контент', 'Гардероб', 'Настройки']) {
  test(`${name}: accessible names, semantics and contrast`, async ({ page }, testInfo) => {
    await boot(page);
    await page.getByLabel(name, { exact: true }).click();
    await testInfo.attach('view', { body: await page.screenshot({ path: testInfo.outputPath('view.png') }), contentType: 'image/png' });
    const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
    await testInfo.attach('accessibility', { body: JSON.stringify(results.violations, null, 2), contentType: 'application/json' });
    expect(results.violations.map(item => ({ id: item.id, impact: item.impact, nodes: item.nodes.map(node => ({ target: node.target, summary: node.failureSummary })) }))).toEqual([]);
  });
}

for (const category of ['Ресурспаки', 'Шейдеры', 'Схематики', 'Скриншоты']) {
  test(`${category}: accessible library controls`, async ({ page }) => {
    await boot(page); await content(page, category);
    await expect(page.getByRole('button', { name: 'Обновить список' })).toBeEnabled();
    const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
    expect(results.violations).toEqual([]);
  });
}

for (const tab of ['Интерфейс', 'Файлы и Java']) {
  test(`${tab}: accessible settings controls`, async ({ page }) => {
    await boot(page); await page.getByLabel('Настройки', { exact: true }).click();
    await page.getByRole('button', { name: tab, exact: true }).click();
    const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
    expect(results.violations).toEqual([]);
  });
}

test('profile and build picker have accessible dialogs', async ({ page }, testInfo) => {
  await boot(page);
  await page.getByLabel('Профиль: QuibyPlayer', { exact: true }).click();
  expect((await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze()).violations).toEqual([]);
  await page.keyboard.press('Escape');
  await page.getByLabel('Настройки', { exact: true }).click();
  await page.getByRole('button', { name: /Выбрать сборку/ }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('build-picker.png') });
  expect((await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze()).violations).toEqual([]);
});
