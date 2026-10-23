import { test, expect, boot } from './fixtures';

test('network settings show actual route, wait for diagnosis and recover from errors', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('fixture-network-report',JSON.stringify({
    at:'2026-10-23T17:43:12.067Z',reason:'relay',source:'diagnostic',launcherVersion:'1.1.6',measurement:'minecraft-pong-rtt',
    normal:[120,122,121,119,123],relay:[90,91,92,90,89],direct:[],kcp:[],probeErrors:{direct:{message:'Minecraft ping timeout'}},
  })));
  await boot(page);
  await page.getByLabel('Настройки',{exact:true}).click();
  await page.getByRole('button',{name:'Сеть',exact:true}).click();
  await expect(page.getByText('Результат проверки: Relay · через VPS')).toBeVisible();
  await expect(page.locator('.network-results > div').filter({hasText:'Обычный'}).locator('dd')).toContainText('121 мс');
  await expect(page.locator('.network-results > div').filter({hasText:'Relay'}).locator('dd')).toContainText('90 мс');
  await expect(page.getByText('Minecraft ping timeout')).toBeVisible();
  await page.evaluate(() => { (window as any).__test.delays.checkNetwork=500; });
  await page.getByRole('button',{name:'Проверить маршруты'}).click();
  await expect(page.getByRole('button',{name:'Проверяем…'})).toBeDisabled();
  await expect(page.getByText('Проверка завершена. При запуске игры маршрут проверится заново.')).toBeVisible();
  await page.evaluate(() => { (window as any).__test.failures.checkNetwork='API недоступен'; });
  await page.getByRole('button',{name:'Проверить маршруты'}).click();
  await expect(page.getByText('API недоступен',{exact:true})).toBeVisible();
  await expect(page.getByRole('button',{name:'Проверить маршруты'})).toBeEnabled();
  await page.screenshot({path:'test-results/network-settings.png',fullPage:true});
});

test('network check stays unavailable while Minecraft is running', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('fixture-running','true'));
  await page.goto('/');
  await page.getByLabel('Настройки',{exact:true}).click();
  await page.getByRole('button',{name:'Сеть',exact:true}).click();
  await expect(page.getByRole('button',{name:'Проверить маршруты'})).toBeDisabled();
  await expect(page.getByText('Проверка доступна после закрытия Minecraft.')).toBeVisible();
});
