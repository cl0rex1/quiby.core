import fs from 'node:fs/promises';
import path from 'node:path';
import { test, expect, boot } from './fixtures';
import AxeBuilder from '@axe-core/playwright';

test('global lock replaces the launcher, preserves the session and automatically reopens', async ({ page },info) => {
  let closed=false;
  await page.route('**/api/launcher/access',route=>route.fulfill({json:{closed,message:'Готовим обновление сезона. Скоро вернёмся.'}}));
  await boot(page);
  closed=true;await page.evaluate(()=>window.dispatchEvent(new Event('focus')));
  await expect(page.getByRole('heading',{name:'Доступ временно закрыт'})).toBeVisible();
  await expect(page.getByLabel('Контент',{exact:true})).toHaveCount(0);
  await expect(page.getByRole('button',{name:'Запустить игру',exact:true})).toHaveCount(0);
  await expect(page.getByRole('status')).toContainText('Готовим обновление');
  expect((await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa']).analyze()).violations).toEqual([]);
  await page.screenshot({path:info.outputPath('launcher-closed.png')});
  closed=false;await page.getByRole('button',{name:'Проверить снова'}).click();
  await expect(page.getByRole('button',{name:'Запустить игру',exact:true})).toBeEnabled();
  expect(await page.evaluate(()=>!!localStorage.getItem('quiby_session'))).toBe(true);
});

test('an offline access check shows retry and recovers without false maintenance', async ({page})=>{
  let failed=true;await page.route('**/api/launcher/access',route=>failed?route.abort():route.fulfill({json:{closed:false,message:''}}));
  await page.goto('/');await expect(page.getByRole('heading',{name:'Нет соединения'})).toBeVisible();
  failed=false;await page.getByRole('button',{name:'Проверить снова'}).click();
  await expect(page.getByRole('button',{name:'Запустить игру',exact:true})).toBeEnabled();
});

test('admin can close and reopen global access with a message',async({page},info)=>{
  const root=path.resolve(__dirname,'../../server/public/admin');let access={closed:false,message:'Скоро вернёмся'};
  await page.route('**/admin/**',async route=>{const name=new URL(route.request().url()).pathname.replace('/admin/','')||'index.html';await route.fulfill({body:await fs.readFile(path.join(root,name)),contentType:name.endsWith('.js')||name.endsWith('.mjs')?'text/javascript':name.endsWith('.css')?'text/css':'text/html'});});
  await page.route('**/api/control/**',async route=>{const request=route.request(),url=new URL(request.url());if(url.pathname.endsWith('launcher-access')){if(request.method()==='PUT'){expect(request.headers()['x-quiby-control']).toBe('1');access=request.postDataJSON();}return route.fulfill({json:access});}if(url.pathname.endsWith('session'))return route.fulfill({json:{authenticated:true}});if(url.pathname.endsWith('overview'))return route.fulfill({json:{users:{total:1,allowed:1},mods:{pending:0},names:{pending:0},pack:'6.1.23'}});await route.fulfill({json:{items:[],total:0,page:1,pageSize:30}});});
  await page.goto('/admin/');await page.getByRole('button',{name:'Игроки',exact:true}).click();await page.getByRole('button',{name:'Доступ к лаунчеру',exact:true}).click();
  await page.getByRole('switch',{name:'Закрыть доступ всем'}).check();
  await page.getByLabel('Сообщение игрокам').fill('Проводим технические работы');
  await page.getByRole('button',{name:'Сохранить доступ'}).click();
  await expect(page.locator('#access-status')).toHaveText('Общий доступ закрыт');
  expect(access).toEqual({closed:true,message:'Проводим технические работы'});
  await page.screenshot({path:info.outputPath('admin-launcher-access.png')});
  await page.getByRole('switch',{name:'Закрыть доступ всем'}).uncheck();await page.getByRole('button',{name:'Сохранить доступ'}).click();
  await expect(page.locator('#access-status')).toHaveText('Доступ открыт');
});

test('personalized launcher access sends the session and reacts when an exception is revoked',async({page})=>{
  let exempt=true;
  await page.route('**/api/launcher/access',route=>{
    expect(route.request().headers().authorization).toBe('Bearer local-fixture');
    return route.fulfill({json:{closed:!exempt,message:'Технические работы',canLogin:true}});
  });
  await boot(page);await expect(page.getByRole('button',{name:'Запустить игру',exact:true})).toBeVisible();
  exempt=false;await page.evaluate(()=>window.dispatchEvent(new Event('focus')));
  await expect(page.getByRole('heading',{name:'Доступ временно закрыт'})).toBeVisible();
  await page.getByRole('button',{name:'Войти через Discord',exact:true}).click();
  await expect(page.getByRole('button',{name:'← К статусу доступа'})).toBeVisible();
  await page.getByRole('button',{name:'← К статусу доступа'}).click();
  await expect(page.getByRole('heading',{name:'Доступ временно закрыт'})).toBeVisible();
});
