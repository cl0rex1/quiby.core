import fs from 'node:fs/promises';
import path from 'node:path';
import { test, expect } from './fixtures';

test('admin news editor submits broadcasts and preserves drafts while polling', async ({ page }, info) => {
  const adminRoot = path.resolve(__dirname, '../../server/public/admin');
  await page.route('**/admin/**', async route => {
    const name = new URL(route.request().url()).pathname.replace('/admin/', '') || 'index.html';
    await route.fulfill({ body: await fs.readFile(path.join(adminRoot, name)), contentType: /\.m?js$/.test(name) ? 'text/javascript' : name.endsWith('.css') ? 'text/css' : 'text/html' });
  });
  let articles: any[] = [];
  const submissions: any[] = [];
  await page.route('**/api/control/**', async route => {
    const request = route.request(), pathname = new URL(request.url()).pathname;
    if (pathname.endsWith('/overview')) return route.fulfill({ json: { users: { total: 1, allowed: 1 }, mods: { pending: 0 }, names: { pending: 0 }, pack: '6.1' } });
    if (pathname.endsWith('/session')) return route.fulfill({ json: { authenticated: true } });
    if (pathname.endsWith('/news/preview')) return route.fulfill({ json: { html: '<h2>Встреча</h2><p><strong>Сегодня</strong></p>' } });
    if (request.method() !== 'GET') {
      expect(request.headers()['x-quiby-control']).toBe('1');
      const input = request.postDataJSON(); submissions.push(input);
      articles = [{ ...input, id: 'test', date: new Date().toISOString(), broadcastRevision: input.broadcast ? 'revision' : undefined }];
      return route.fulfill({ json: { success: true } });
    }
    await route.fulfill({ json: { items: pathname.endsWith('/news') ? articles : [], total: articles.length, page: 1, pageSize: 30 } });
  });
  await page.goto('/admin/');
  await page.getByRole('button', { name: 'Новости и рассылки' }).click();
  await page.locator('#add-news').click();
  await page.getByLabel('Заголовок', { exact: true }).fill('Объявление для всех');
  await page.getByLabel('Текст', { exact: true }).fill('Сервер открыт. Добро пожаловать!');
  await page.getByRole('button', { name: 'Предпросмотр', exact: true }).click();
  await expect(page.frameLocator('#news-preview').getByRole('heading', { name: 'Встреча' })).toBeVisible();
  await page.getByLabel('Уведомить всех в лаунчере').check();
  await page.screenshot({ path: info.outputPath('news-editor.png') });
  await page.getByRole('button', { name: 'Опубликовать', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  expect(submissions[0]).toMatchObject({ title: 'Объявление для всех', broadcast: true });
  await page.getByRole('button', { name: 'Изменить', exact: true }).click();
  await expect(page.getByLabel('Уведомить всех в лаунчере')).not.toBeChecked();
  await expect(page.getByLabel('Заголовок', { exact: true })).toHaveValue('Объявление для всех');
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
});
