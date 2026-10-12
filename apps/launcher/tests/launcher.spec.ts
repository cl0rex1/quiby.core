import { test, expect, boot, content, emit } from './fixtures';

test('settings clamp incomplete numbers and preserve unrelated changes', async ({ page }) => {
  await boot(page);
  await page.getByLabel('Настройки', { exact: true }).click();
  const width = page.getByLabel('Ширина окна', { exact: true });
  await width.fill('99999'); await width.press('Enter');
  await expect(width).toHaveValue('7680');
  await width.fill(''); await width.press('Tab');
  await expect(width).toHaveValue('7680');
  await page.getByLabel('На весь экран', { exact: false }).check();
  await page.getByRole('button', { name: 'Файлы и Java', exact: true }).click();
  const java = page.getByLabel('Исполняемый файл', { exact: true });
  await java.fill('C:\\Java 21\\bin\\javaw.exe');
  await expect.poll(() => page.evaluate(() => (window as any).__test.calls.filter((c: any) => c.name === 'saveSettings').length)).toBe(2);
  await java.press('Enter');
  const saved = await page.evaluate(() => (window as any).__test.calls.filter((c: any) => c.name === 'saveSettings').at(-1).args[0]);
  expect(saved).toMatchObject({ javaPath: 'C:\\Java 21\\bin\\javaw.exe', fullscreen: true, windowWidth: 7680 });
});

test('failed save can be retried at the minimum window size', async ({ page }) => {
  await page.setViewportSize({ width: 980, height: 620 });
  await boot(page);
  await page.evaluate(() => { (window as any).__test.failures.saveSettings = 'Диск недоступен'; });
  await page.getByLabel('Настройки', { exact: true }).click();
  await page.getByLabel('На весь экран', { exact: false }).check();
  await expect(page.getByRole('button', { name: 'Повторить', exact: true })).toBeVisible();
  await page.evaluate(() => { delete (window as any).__test.failures.saveSettings; });
  await page.getByRole('button', { name: 'Повторить', exact: true }).click();
  await expect(page.getByText('Сохранено', { exact: true })).toBeVisible();
});

test('rapid launch clicks cause one request and a useful error', async ({ page }) => {
  await boot(page);
  await page.evaluate(() => { (window as any).__test.delays.launchGame = 200; });
  await page.getByRole('button', { name: 'Запустить игру', exact: true }).dblclick();
  await expect(page.getByRole('alert')).toContainText('Сервер авторизации недоступен');
  expect(await page.evaluate(() => (window as any).__test.calls.filter((c: any) => c.name === 'launchGame').length)).toBe(1);
});

test('profile draft survives background parent renders and Escape restores focus', async ({ page }) => {
  await boot(page);
  const profile = page.getByLabel('Профиль: QuibyPlayer', { exact: true });
  await profile.click();
  await page.getByRole('button', { name: 'Сменить ник через заявку' }).click();
  await page.getByLabel('Новый ник Minecraft', { exact: true }).fill('NewPlayer');
  await emit(page, 'onPlaytimeTick', 60);
  await expect(page.getByLabel('Новый ник Minecraft', { exact: true })).toHaveValue('NewPlayer');
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(profile).toBeFocused();
});

test('skin caption dialog traps focus and closes with Escape from any control', async ({ page }) => {
  await page.addInitScript(() => {
    const canvas = document.createElement('canvas'); canvas.width = canvas.height = 64;
    localStorage.setItem('quiby_custom_skin_data', canvas.toDataURL());
    localStorage.setItem('quiby_custom_skin_name', 'custom.png');
  });
  await boot(page);
  await page.getByLabel('Гардероб', { exact: true }).click();
  await page.getByTitle('Изменить название скина').click();
  await page.getByRole('button', { name: 'Сохранить', exact: true }).focus();
  await page.keyboard.press('Shift+Tab');
  await page.getByLabel('Главная', { exact: true }).evaluate((element: HTMLElement) => element.focus());
  expect(await page.evaluate(() => Boolean(document.activeElement?.closest('dialog')))).toBe(true);
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
});

test('bulk imports are sequential and a failed replacement keeps the previous mod', async ({ page }) => {
  await boot(page); await content(page, 'Моды');
  const file = { name: 'fixture.JAR', mimeType: 'application/java-archive', buffer: Buffer.from('fixture') };
  await page.locator('input[type=file]').first().setInputFiles([file, { ...file, name: 'second.jar' }]);
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('quiby_custom_mods') || '[]').filter((m: any) => m.safetyStatus === 'approved').length)).toBe(2);
  expect(await page.evaluate(() => (window as any).__test.peakImports)).toBe(1);
  await page.evaluate(() => { (window as any).__test.failures.stageCustomMod = 'Недоступно'; });
  await page.locator('input[type=file]').first().setInputFiles(file);
  await expect(page.getByRole('alert')).toContainText('Не удалось добавить мод');
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('quiby_custom_mods') || '[]').filter((m: any) => m.safetyStatus === 'approved').length)).toBe(2);
});

test('dropping a file behind a modal never imports it', async ({ page }) => {
  await boot(page); await content(page, 'Моды');
  await page.getByLabel('Профиль: QuibyPlayer', { exact: true }).click();
  await page.evaluate(() => {
    const transfer = new DataTransfer(); transfer.items.add(new File(['fixture'], 'behind-dialog.jar'));
    window.dispatchEvent(new DragEvent('drop', { bubbles: true, cancelable: true, dataTransfer: transfer }));
  });
  expect(await page.evaluate(() => (window as any).__test.calls.filter((c: any) => c.name === 'stageCustomMod').length)).toBe(0);
});

test('game files cannot be imported while Minecraft runs', async ({ page }) => {
  await boot(page);
  await emit(page, 'onLaunchStateChange', { status: 'running' });
  await content(page, 'Моды');
  await expect(page.getByRole('button', { name: 'Добавить файл' })).toBeDisabled();
  await page.getByRole('navigation', { name: 'Тип контента' }).getByRole('button', { name: /Ресурспаки/ }).click();
  await expect(page.getByRole('button', { name: 'Добавить файл' })).toBeDisabled();
  await emit(page, 'onLaunchStateChange', { status: 'stopped' });
  await expect(page.getByRole('button', { name: 'Добавить файл' })).toBeEnabled();
});

test('screenshot navigation keeps the last request and Escape dismisses the viewer', async ({ page }) => {
  await boot(page); await content(page, 'Скриншоты');
  await page.getByRole('button', { name: /one.png/ }).first().click();
  await expect(page.getByRole('dialog', { name: 'one.png' })).toBeVisible();
  await page.evaluate(() => { (window as any).__test.delays['getScreenshotImage:two.png'] = 500; });
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: /three.png/ }).first().click();
  await expect(page.getByRole('dialog', { name: 'three.png' })).toBeVisible();
  await page.waitForTimeout(550); // Let the deliberately delayed previous image arrive.
  await expect(page.getByRole('dialog', { name: 'three.png' })).toBeVisible();
});

test('library displays a loading state instead of a false empty state', async ({ page }) => {
  await boot(page);
  await page.evaluate(() => { (window as any).__test.delays.getShaderpacks = 800; });
  await content(page, 'Шейдеры');
  await expect(page.getByRole('status')).toContainText('Читаем папку');
  await expect(page.getByRole('heading', { name: 'Шейдеров пока нет' })).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'Шейдеров пока нет' })).toBeVisible();
});

test('a retry clears a stale library error', async ({ page }) => {
  await boot(page);
  await page.evaluate(() => { (window as any).__test.failures.getShaderpacks = 'Папка недоступна'; });
  await content(page, 'Шейдеры');
  await expect(page.getByRole('alert')).toBeVisible();
  await page.evaluate(() => { delete (window as any).__test.failures.getShaderpacks; });
  await page.getByRole('button', { name: 'Обновить список' }).click();
  await expect(page.getByRole('alert')).toHaveCount(0);
});

test('motion preferences stop video and CSS motion and survive a reload', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' }); await boot(page);
  await page.getByLabel('Настройки', { exact: true }).click();
  await page.getByRole('button', { name: 'Интерфейс', exact: true }).click();
  await page.getByRole('switch', { name: 'Меньше движения' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-motion', 'reduced');
  await page.getByLabel('Главная', { exact: true }).click();
  expect(await page.locator('video').evaluateAll(videos => videos.every(video => (video as HTMLVideoElement).paused))).toBe(true);
  expect(await page.locator('.view-enter').first().evaluate(el => getComputedStyle(el).animationName)).toBe('none');
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-motion', 'reduced');
});

test('normal motion animates dialogs and toast arrival', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' }); await boot(page);
  await page.getByLabel('Профиль: QuibyPlayer', { exact: true }).click();
  expect(await page.getByRole('dialog').evaluate(el => getComputedStyle(el).animationName)).not.toBe('none');
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Запустить игру', exact: true }).click();
  await expect(page.getByRole('alert')).toBeVisible();
  expect(await page.locator('.launcher-toast').evaluate(el => getComputedStyle(el).animationName)).not.toBe('none');
});

test('a burst of logs stays bounded and can be cleared', async ({ page }) => {
  await boot(page); await emit(page, 'onLaunchStateChange', { status: 'updating' });
  await page.evaluate(() => {
    for (let i = 0; i < 1500; i++) (window as any).__test.emit('onGameLog', { id: String(i), timestamp: '12:00', level: 'info', source: 'game', message: `Log ${i}` });
  });
  await expect(page.getByText('1000 строк', { exact: true })).toBeVisible();
  await page.getByText('Журнал запуска', { exact: true }).click();
  await expect(page.locator('.launch-log-lines p')).toHaveCount(500);
  await page.getByTitle('Очистить журнал').click();
  await expect(page.getByText('0 строк', { exact: true })).toBeVisible();
});

test('a renderer reload restores the running game state', async ({ page }) => {
  await boot(page); await page.evaluate(() => localStorage.setItem('fixture-running', 'true')); await page.reload();
  await expect(page.getByRole('button', { name: 'Остановить игру' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Запустить игру', exact: true })).toHaveCount(0);
});

test('required update blocks launch and shows download progress', async ({ page }) => {
  await boot(page);
  await emit(page, 'onUpdateState', { status: 'available', required: true, currentVersion: '1', latestVersion: '2' });
  await expect(page.getByRole('button', { name: 'Обновите лаунчер' })).toBeDisabled();
  await emit(page, 'onUpdateState', { status: 'downloading', required: true, currentVersion: '1', latestVersion: '2', percent: 125 });
  await expect(page.getByRole('progressbar', { name: 'Скачивание обновления' })).toHaveAttribute('aria-valuenow', '100');
  await page.getByLabel('Настройки', { exact: true }).click();
  await page.getByRole('button', { name: 'Файлы и Java', exact: true }).click();
  await emit(page, 'onUpdateState', { status: 'downloading', required: true, currentVersion: '1', latestVersion: '2', percent: 125 });
  const progressBars = page.getByRole('progressbar', { name: 'Скачивание обновления' });
  await expect(progressBars).toHaveCount(2);
  for (const progress of await progressBars.all()) await expect(progress).toHaveAttribute('aria-valuenow', '100');
});

test('minimum-size navigation preserves visible home actions', async ({ page }) => {
  await page.setViewportSize({ width: 980, height: 620 }); await boot(page);
  const logo = await page.locator('.home-season-logo').boundingBox();
  const dock = await page.locator('.launcher-dock').boundingBox();
  expect(logo!.x + logo!.width).toBeLessThan(dock!.x);
  expect(dock!.y + dock!.height).toBeLessThanOrEqual(620);
  for (const name of ['Контент', 'Гардероб', 'Настройки', 'Главная']) {
    await page.getByLabel(name, { exact: true }).click();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
});
