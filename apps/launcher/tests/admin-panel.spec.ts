import fs from 'node:fs/promises';
import path from 'node:path';
import { test, expect } from './fixtures';
import AxeBuilder from '@axe-core/playwright';

async function admin(page: import('@playwright/test').Page, accessHandler?: (route: import('@playwright/test').Route) => Promise<void>) {
  const root=path.resolve(__dirname,'../../server/public/admin');
  await page.route('**/admin/**',async route=>{
    const name=new URL(route.request().url()).pathname.replace('/admin/','')||'index.html';
    await route.fulfill({body:await fs.readFile(path.join(root,name)),contentType:/\.m?js$/.test(name)?'text/javascript':name.endsWith('.css')?'text/css':'text/html'});
  });
  await page.route('**/api/control/**',async route=>{
    const url=new URL(route.request().url());
    if(url.pathname.endsWith('/session'))return route.fulfill({json:{authenticated:true}});
    if(url.pathname.endsWith('/launcher-access'))return accessHandler ? accessHandler(route) : route.fulfill({json:{closed:false,message:'Скоро вернёмся',updatedAt:null}});
    if(url.pathname.endsWith('/overview'))return route.fulfill({json:{users:{total:12,allowed:10},mods:{pending:2},names:{pending:1},pack:'6.1.23'}});
    const item={id:1,status:'pending',mod_name:'Create Radar',filename:'create_radar.jar',hash_sha1:'a'.repeat(40),reason:'Полезный радар для сборки',mc_username:'Tester',created_at:'2026-10-21 10:00:00'};
    await route.fulfill({json:{items:url.pathname.endsWith('/mods')?[item]:[],total:url.pathname.endsWith('/mods')?1:0,page:1,pageSize:30}});
  });
}

test('background refresh keeps unchanged rows, focus and filters; navigation restores each section',async({page})=>{
  await page.clock.install();await admin(page);await page.goto('/admin/');
  await expect(page.getByRole('heading',{name:'Create Radar'})).toBeVisible();
  await page.locator('.row').evaluate(el=>el.setAttribute('data-original','yes'));
  await page.clock.fastForward(61000);
  await expect(page.locator('.row')).toHaveAttribute('data-original','yes');
  await expect(page.getByLabel('Загрузка записей')).toHaveCount(0);
  await page.getByLabel('Поиск',{exact:true}).fill('Create');await page.clock.fastForward(300);
  await expect(page.locator('#list')).toContainText('Create Radar');
  await page.clock.fastForward(61000);await expect(page.getByLabel('Поиск',{exact:true})).toBeFocused();
  await page.getByRole('button',{name:'Игроки',exact:true}).click();
  await page.getByRole('button',{name:'Моды и вайтлист',exact:true}).click();
  await expect(page.getByLabel('Поиск',{exact:true})).toHaveValue('Create');
  await expect(page).toHaveURL(/#mods$/);
  await page.reload();await expect(page.getByRole('heading',{name:'Моды и вайтлист',exact:true})).toBeVisible();
});

test('access fetch failure is retryable, cannot overwrite settings, and keeps drafts across navigation',async({page},info)=>{
  let fail=true,saves=0;
  await admin(page,async route=>{
    if(route.request().method()==='PUT'){saves++;return route.fulfill({json:{...route.request().postDataJSON(),updatedAt:'2026-10-21T10:00:00Z'}});}
    if(fail)return route.fulfill({status:503,json:{error:'Сервер временно недоступен'}});
    return route.fulfill({json:{closed:false,message:'Скоро вернёмся',updatedAt:null}});
  });
  await page.goto('/admin/#access');
  await expect(page.getByRole('alert').filter({hasText:'Сервер временно недоступен'})).toBeVisible();
  await expect(page.getByRole('switch')).toBeDisabled();await expect(page.getByRole('button',{name:'Сохранить доступ'})).toBeDisabled();
  expect(saves).toBe(0);fail=false;await page.getByRole('button',{name:'Повторить',exact:true}).click();
  await expect(page.locator('#access-status')).toHaveText('Доступ открыт');
  await page.getByRole('switch').check();await page.getByLabel('Сообщение игрокам').fill('Обновляем сервер. Скоро вернёмся.');
  await expect(page.locator('#access-preview-message')).toHaveText('Обновляем сервер. Скоро вернёмся.');
  await expect(page.locator('#access-status')).toHaveText('Доступ открыт');
  await page.getByRole('button',{name:'Игроки',exact:true}).click();await page.getByRole('button',{name:'Доступ к лаунчеру',exact:true}).click();
  await expect(page.getByLabel('Сообщение игрокам')).toHaveValue('Обновляем сервер. Скоро вернёмся.');
  await page.getByRole('button',{name:'Сохранить доступ'}).click();await expect(page.locator('#access-status')).toHaveText('Доступ закрыт для всех');
  await expect(page.locator('#access-draft')).toHaveText('Все изменения сохранены');expect(saves).toBe(1);
  await page.screenshot({path:info.outputPath('admin-access-desktop.png'),fullPage:true});
  expect((await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa']).analyze()).violations).toEqual([]);
  await page.setViewportSize({width:390,height:844});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.screenshot({path:info.outputPath('admin-access-mobile.png'),fullPage:true});
});

test('late list response cannot replace launcher access view',async({page})=>{
  await admin(page);
  let release!:()=>void;const hold=new Promise<void>(resolve=>{release=resolve;});
  await page.route('**/api/control/players?*',async route=>{await hold;await route.fulfill({json:{items:[],total:0,pageSize:30}}).catch(()=>{});});
  await page.goto('/admin/');await expect(page.locator('.row')).toBeVisible();
  await page.getByRole('button',{name:'Игроки',exact:true}).click();
  await page.getByRole('button',{name:'Доступ к лаунчеру',exact:true}).click();
  await expect(page.locator('#access-status')).toHaveText('Доступ открыт');release();
  await expect(page.locator('#records-panel')).toBeHidden();
  await expect(page.getByRole('heading',{name:'Доступ к лаунчеру',exact:true})).toBeVisible();
});
