import AxeBuilder from '@axe-core/playwright';
import type { Page } from '@playwright/test';
import { test, expect, boot, content, emit } from './fixtures';

async function seedMods(page: Page, mixed = false) {
  await page.addInitScript(({ mixed }) => {
    const names = ['Cinematic Zoom', 'Iris Shaders', 'E4all', 'Bobby ReNeoForged [Unofficial NeoForge]', 'Better Clouds', 'Ambient Sounds', 'Mouse Tweaks', 'Dynamic Lights', 'Inventory Profiles Next', 'AppleSkin', 'Entity Culling', 'Sound Physics Remastered'];
    localStorage.setItem('quiby_custom_mods', JSON.stringify(names.map((name, index) => ({
      id: `mod-${index}`, name, filename: `library-${index}-neoforge-1.21.1.jar`, size: 1363148 + index * 110003,
      enabled: index !== 3, safetyStatus: mixed && index === 1 ? 'pending' : mixed && index === 2 ? 'blocked' : 'approved',
      hashSha1: mixed ? undefined : 'a'.repeat(40), description: 'Больше деталей и возможностей для твоего мира',
      projectUrl: 'https://modrinth.com/mod/fixture',
      iconUrl: 'data:image/svg+xml,' + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40"><rect width="40" height="40" rx="9" fill="${['#443551', '#275547', '#46472b', '#503542'][index % 4]}"/><text x="20" y="26" text-anchor="middle" font-family="sans-serif" font-size="18" fill="white">${name[0]}</text></svg>`),
    }))));
  }, { mixed });
}

for (const viewport of [{ width: 980, height: 620 }, { width: 1100, height: 720 }, { width: 1440, height: 900 }]) {
  test(`content gives files most of the viewport at ${viewport.width}×${viewport.height}`, async ({ page }, info) => {
    await page.setViewportSize(viewport);
    await seedMods(page); await boot(page); await content(page, 'Моды');
    const results = page.locator('.mod-results');
    const bounds = await results.boundingBox();
    expect(bounds!.y).toBeLessThan(240);
    expect(bounds!.height / viewport.height).toBeGreaterThan(.61);
    expect(await page.locator('.content-page').evaluate(element => element.scrollWidth <= element.clientWidth)).toBe(true);
    expect(await results.evaluate(element => element.scrollWidth <= element.clientWidth)).toBe(true);
    await expect(page.getByRole('article')).toHaveCount(12);
    await page.screenshot({ path: info.outputPath('content-grid.png') });
    await page.getByRole('button', { name: 'Список', exact: true }).click();
    await expect(page.locator('.mod-grid')).toHaveClass(/is-list/);
    await page.getByRole('article').last().scrollIntoViewIfNeeded();
    await expect(page.getByRole('article').last()).toBeInViewport();
    await page.screenshot({ path: info.outputPath('content-list.png') });
    await page.getByRole('navigation', { name: 'Тип контента' }).getByRole('button', { name: 'Шейдеры', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Плитки', exact: true })).toHaveAttribute('aria-pressed', 'true');
    await page.getByRole('navigation', { name: 'Тип контента' }).getByRole('button', { name: 'Моды', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Список', exact: true })).toHaveAttribute('aria-pressed', 'true');
  });
}

test('mod search, filtered selection, details and deletion remain usable', async ({ page }) => {
  await seedMods(page); await boot(page); await content(page, 'Моды');
  await page.getByLabel('Поиск модов').fill('library-0-');
  await expect(page.getByRole('article')).toHaveCount(1);
  await page.getByRole('button', { name: 'Выбрать все', exact: true }).click();
  await expect(page.getByRole('checkbox')).toHaveAttribute('aria-checked', 'true');
  await page.getByLabel('Поиск модов').fill('no-match');
  await expect(page.getByRole('heading', { name: 'Ничего не нашлось' })).toBeVisible();
  await expect(page.getByRole('toolbar', { name: 'Управление выбранными файлами' })).toBeVisible();
  await page.getByRole('button', { name: 'Сбросить фильтры' }).click();
  await expect(page.getByRole('article')).toHaveCount(12);
  await page.getByRole('button', { name: 'Снять выделение', exact: true }).click();
  const card = page.getByRole('article').first();
  const toggle = card.getByRole('switch');
  await toggle.click(); await expect(toggle).toHaveAttribute('aria-checked', 'false');
  const details = card.getByRole('button', { name: /Подробнее/ });
  await details.click();
  await expect(card.getByText('library-0-neoforge-1.21.1.jar', { exact: true })).toBeVisible();
  await card.getByRole('link', { name: 'Страница мода' }).focus();
  await page.keyboard.press('Escape');
  await expect(details).toBeFocused(); await expect(details).toHaveAttribute('aria-expanded', 'false');
  await details.click(); await card.getByRole('button', { name: 'Удалить мод', exact: true }).click();
  await expect(page.getByRole('article')).toHaveCount(11);
  expect(await page.evaluate(() => (window as any).__test.calls.filter((call: any) => call.name === 'removeCustomMod').map((call: any) => call.args))).toEqual([['fixture-game', 'library-0-neoforge-1.21.1.jar']]);
});

test('populated content is accessible and locks changes during a game', async ({ page }) => {
  await seedMods(page, true); await boot(page); await content(page, 'Моды');
  await expect(page.getByRole('article').nth(1).getByRole('switch')).toHaveCount(0);
  await expect(page.getByRole('article').nth(2).getByRole('img', { name: 'Заблокирован' })).toBeVisible();
  expect((await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze()).violations).toEqual([]);
  await emit(page, 'onLaunchStateChange', { status: 'running' });
  await expect(page.getByRole('switch').first()).toBeDisabled();
  await page.getByRole('article').first().getByRole('button', { name: /Подробнее/ }).click();
  await expect(page.getByRole('button', { name: 'Удалить мод', exact: true })).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Открыть папку', exact: true })).toBeEnabled();
  expect(await page.locator('.content-category-body').evaluate(element => getComputedStyle(element).animationName)).toBe('none');
});

test('category and card transitions respect motion preferences', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await seedMods(page); await boot(page); await content(page, 'Моды');
  expect(await page.locator('.content-category-body').evaluate(element => getComputedStyle(element).animationName)).toBe('content-arrive');
  expect(await page.getByRole('switch').first().locator('span').evaluate(element => getComputedStyle(element).transitionDuration)).not.toBe('0s');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(page.locator('html')).toHaveAttribute('data-motion', 'reduced');
  expect(await page.locator('.content-category-body').evaluate(element => getComputedStyle(element).animationName)).toBe('none');
  expect(await page.getByRole('switch').first().locator('span').evaluate(element => getComputedStyle(element).transitionDuration)).toBe('0s');
});

test('bundled mods expose only allowed switches and preserve the saved choice', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('fixture-bundled-mods', JSON.stringify([
    { path: 'mods/mousetweaks.jar', modName: 'Mouse Tweaks', modId: 'mousetweaks', userToggleable: true, side: 'client', size: 120000, sha256: 'a'.repeat(64) },
    { path: 'mods/create.jar', modName: 'Create', modId: 'create', side: 'both', size: 28000000, sha256: 'b'.repeat(64) },
  ])));
  await boot(page); await content(page, 'Моды');
  await page.getByRole('button', { name: 'Сборка', exact: true }).click();
  await expect(page.getByRole('article')).toHaveCount(2);
  await expect(page.getByRole('article', { name: 'Create', exact: true }).getByRole('switch')).toHaveCount(0);
  await page.getByRole('combobox', { name: 'Моды сборки' }).click();
  await page.getByRole('option', { name: 'Можно отключить', exact: true }).click();
  await expect(page.getByRole('article')).toHaveCount(1);
  await page.getByRole('combobox', { name: 'Категория модов' }).focus();
  await page.keyboard.press('End'); await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', { name: 'Ничего не нашлось' })).toBeVisible();
  await page.getByRole('button', { name: 'Сбросить фильтры' }).click();
  const toggle = page.getByRole('article', { name: 'Mouse Tweaks', exact: true }).getByRole('switch');
  await toggle.click(); await expect(toggle).toHaveAttribute('aria-checked', 'false');
  await expect(page.getByText('Выключен', { exact: true })).toHaveCount(0);
  await expect(page.getByRole('article', { name: 'Mouse Tweaks', exact: true })).toHaveClass(/is-disabled/);
  expect(await page.evaluate(() => (window as any).__test.calls.filter((call: any) => call.name === 'saveSettings').at(-1).args[0].disabledBundledMods)).toEqual(['mousetweaks']);
  await page.getByRole('button', { name: 'Мои моды', exact: true }).click();
  await page.getByRole('button', { name: 'Сборка', exact: true }).click();
  await expect(toggle).toHaveAttribute('aria-checked', 'false');
});

test('styled filters support keyboard, Escape, outside clicks and accessible options', async ({ page }, info) => {
  await seedMods(page); await boot(page); await content(page, 'Моды');
  const filter = page.getByRole('combobox', { name: 'Категория модов' });
  await filter.focus(); await page.keyboard.press('ArrowDown');
  await expect(page.getByRole('listbox')).toBeVisible();
  await page.screenshot({ path: info.outputPath('filter-menu.png') });
  expect((await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze()).violations).toEqual([]);
  await page.keyboard.press('Escape'); await expect(filter).toBeFocused();
  await expect(page.getByRole('listbox')).toHaveCount(0);
  await filter.click(); await page.getByLabel('Поиск модов').click();
  await expect(page.getByRole('listbox')).toHaveCount(0);
  await filter.focus(); await page.keyboard.press('Home'); await page.keyboard.press('Enter');
  await expect(filter).toContainText('Все категории');
});

test('details animate closed and successful removal animates only visible cards', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await seedMods(page); await boot(page); await content(page, 'Моды');
  const card = page.getByRole('article').first();
  const details = card.getByRole('button', { name: /Подробнее/ });
  await details.click();
  await expect(card.getByRole('button', { name: 'Удалить мод', exact: true })).toBeVisible();
  await details.click();
  expect(await card.locator('.mod-card-details-clip').evaluate(element => (element as HTMLElement).inert)).toBe(true);
  expect(await card.locator('.mod-card-details-grid').evaluate(element => getComputedStyle(element).transitionDuration)).not.toBe('0s');
  await expect(card.getByRole('button', { name: 'Удалить мод', exact: true })).toHaveCount(0);
  await page.evaluate(() => {
    const original = HTMLElement.prototype.animate;
    (window as any).__removals = [];
    HTMLElement.prototype.animate = function(frames, options) {
      if (this.dataset.fileId) (window as any).__removals.push({ id: this.dataset.fileId, options });
      return original.call(this, frames, options);
    };
    (window as any).__test.failures.removeCustomMod = 'Нет доступа';
  });
  await details.click(); await card.getByRole('button', { name: 'Удалить мод', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('Не удалось удалить моды');
  await expect(page.getByRole('article')).toHaveCount(12);
  expect(await page.evaluate(() => (window as any).__removals.length)).toBe(0);
  await page.evaluate(() => { delete (window as any).__test.failures.removeCustomMod; });
  await page.getByRole('button', { name: 'Выбрать все', exact: true }).click();
  await page.getByRole('toolbar', { name: 'Управление выбранными файлами' }).getByRole('button', { name: 'Удалить', exact: true }).click();
  await expect(page.getByRole('article')).toHaveCount(0);
  const animations = await page.evaluate(() => (window as any).__removals);
  expect(animations.length).toBeGreaterThan(0); expect(animations.length).toBeLessThan(12);
  expect(animations.every((animation: any) => animation.options.duration === 160)).toBe(true);
});

for (const [category, kind] of [['Шейдеры', 'shaderpacks'], ['Схематики', 'schematics'], ['Ресурспаки', 'resourcepacks']]) {
  test(`${category} shares file cards, details and deletion`, async ({ page }, info) => {
    await boot(page);
    await page.evaluate(kind => {
      (window as any).__test.files[`${kind}:fixture-game`] = Array.from({ length: 4 }, (_, index) => ({
        name: `Library ${index + 1}`, filename: `library-${index + 1}.${kind === 'schematics' ? 'nbt' : 'zip'}`, size: 1200000, updatedAt: 1000,
        status: 'approved', isAllowed: true, official: false,
      }));
    }, kind);
    await content(page, category); await expect(page.getByRole('article')).toHaveCount(4);
    await page.screenshot({ path: info.outputPath('library-grid.png') });
    await page.getByRole('button', { name: 'Список', exact: true }).click();
    await page.getByRole('article').first().getByRole('button', { name: /Подробнее/ }).click();
    await page.screenshot({ path: info.outputPath('library-details.png') });
    await page.getByRole('article').first().getByRole('button', { name: 'Удалить', exact: true }).click();
    await expect(page.getByRole('article')).toHaveCount(3);
    await page.getByRole('button', { name: 'Выбрать все', exact: true }).click();
    await page.getByRole('toolbar').getByRole('button', { name: 'Удалить', exact: true }).click();
    await expect(page.getByRole('article')).toHaveCount(0);
  });
}

test('compact settings remain reachable at minimum size', async ({ page }, info) => {
  await page.setViewportSize({ width: 980, height: 620 });
  await boot(page); await page.getByLabel('Настройки', { exact: true }).click();
  for (const [section, file] of [['Игра', 'game'], ['Интерфейс', 'appearance'], ['Файлы и Java', 'files']]) {
    await page.getByRole('navigation', { name: 'Разделы настроек' }).getByRole('button', { name: section, exact: true }).click();
    expect(await page.locator('.settings-body').evaluate(element => element.scrollWidth <= element.clientWidth)).toBe(true);
    await page.screenshot({ path: info.outputPath(`settings-${file}.png`) });
  }
  await page.getByRole('button', { name: /Дополнительные параметры Java/ }).click();
  await page.getByLabel('Ваши параметры JVM').fill('-Dfile.encoding=UTF-8');
  await page.getByRole('button', { name: 'Сохранить параметры' }).click();
  expect(await page.evaluate(() => (window as any).__test.calls.filter((call: any) => call.name === 'saveSettings').at(-1).args[0].customJvmArgs)).toBe('-Dfile.encoding=UTF-8');
});
