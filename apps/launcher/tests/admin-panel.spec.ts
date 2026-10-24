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
  await page.getByRole('button',{name:'Вайтлист контента',exact:true}).click();
  await expect(page.getByLabel('Поиск',{exact:true})).toHaveValue('Create');
  await expect(page).toHaveURL(/#mods$/);
  await page.reload();await expect(page.getByRole('heading',{name:'Вайтлист контента',exact:true})).toBeVisible();
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
  await page.getByRole('button',{name:'Сохранить доступ'}).click();await expect(page.locator('#access-status')).toHaveText('Общий доступ закрыт');
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

test('whitelist categories filter before pagination, restore their state and accept a local ZIP for manual review',async({page},info)=>{
  await admin(page);
  const records=[{id:1,mod_name:'Create Radar',filename:'radar.jar'},{id:2,mod_name:'Fresh Animations',filename:'fresh.zip'},{id:3,mod_name:'Low Shield',filename:'shield.ZIP'}].map(item=>({...item,status:'pending',hash_sha1:String(item.id).repeat(40),reason:'Тестовая заявка',mc_username:'Tester',created_at:'2026-10-21 10:00:00'}));
  await page.route('**/api/control/mods?*',async route=>{
    const q=new URL(route.request().url()).searchParams,category=q.get('category'),current=Number(q.get('page'));
    const filtered=records.filter(item=>category==='mods'?/\.jar$/i.test(item.filename):category==='resourcepacks'?/\.zip$/i.test(item.filename):true);
    await route.fulfill({json:{items:filtered.slice(current-1,current),total:filtered.length,pageSize:1,categories:{all:3,mods:1,resourcepacks:2,other:0}}});
  });
  await page.goto('/admin/');await expect(page.getByRole('button',{name:'Другое',exact:true})).toBeHidden();
  await page.getByRole('button',{name:'Ресурспаки',exact:true}).click();
  await expect(page.getByRole('heading',{name:'Fresh Animations',exact:true})).toBeVisible();
  await page.getByRole('button',{name:'Следующая страница'}).click();await expect(page.getByRole('heading',{name:'Low Shield',exact:true})).toBeVisible();
  await page.getByRole('button',{name:'Моды',exact:true}).click();await expect(page.getByRole('heading',{name:'Create Radar',exact:true})).toBeVisible();
  await page.getByRole('button',{name:'Ресурспаки',exact:true}).click();await expect(page.getByRole('heading',{name:'Low Shield',exact:true})).toBeVisible();
  await expect(page).toHaveURL(/#mods\/resourcepacks$/);
  await page.screenshot({path:info.outputPath('whitelist-categories.png')});
  await page.goBack();await expect(page.getByRole('button',{name:'Моды',exact:true})).toHaveAttribute('aria-pressed','true');
  await page.goBack();await expect(page.getByRole('button',{name:'Ресурспаки',exact:true})).toHaveAttribute('aria-pressed','true');
  await page.goBack();await expect(page.getByRole('button',{name:'Все',exact:true})).toHaveAttribute('aria-pressed','true');
  const zip=Buffer.alloc(22);zip.writeUInt32LE(0x06054b50);
  await page.locator('#jar-file').setInputFiles({name:'Textures.zip',mimeType:'application/zip',buffer:zip});
  await expect(page.getByRole('heading',{name:'Добавить ресурспак'})).toBeVisible();
  await expect(page.getByLabel('Имя файла',{exact:true})).toHaveValue('Textures.zip');
  await expect(page.getByLabel('SHA-1',{exact:true})).toHaveValue(/^[a-f0-9]{40}$/);
});

test('players own global settings, personal access, exceptions and filters',async({page},info)=>{
  await admin(page);
  const users=[{id:1,discord_id:'123456789012345678',discord_username:'Tester',mc_username:'Tester',uuid:'test-uuid',is_whitelisted:1,launcher_access_exempt:0,playtime_seconds:7230,last_login_at:'2026-10-21 10:00:00'},{id:2,discord_id:'223456789012345678',discord_username:'Blocked',mc_username:'Blocked',uuid:'blocked-uuid',is_whitelisted:0,launcher_access_exempt:0}];
  await page.route('**/api/control/players**',async route=>{
    const q=new URL(route.request().url());
    if(route.request().method()==='PATCH'){
      const user=users.find(item=>q.pathname.endsWith(item.discord_id))!,body=route.request().postDataJSON();
      if(body.allowed!==undefined)user.is_whitelisted=Number(body.allowed);
      if(body.launcherExempt!==undefined)user.launcher_access_exempt=Number(body.launcherExempt);
      if(!user.is_whitelisted)user.launcher_access_exempt=0;
      return route.fulfill({json:{success:true}});
    }
    const filter=q.searchParams.get('access'),items=users.filter(user=>filter==='exempt'?user.launcher_access_exempt&&user.is_whitelisted:filter==='blocked'?!user.is_whitelisted:filter==='allowed'?user.is_whitelisted:true);
    await route.fulfill({json:{items,total:items.length,pageSize:30}});
  });
  page.on('dialog',dialog=>dialog.accept());
  await page.goto('/admin/');await expect(page.getByRole('button',{name:'Доступ к лаунчеру',exact:true})).toBeHidden();
  await page.getByRole('button',{name:'Игроки',exact:true}).click();
  const tester=page.locator('.row').filter({has:page.getByRole('heading',{name:'Tester',exact:true})});
  await expect(tester).toContainText('2 ч 0 мин');
  await tester.getByRole('button',{name:'Разрешить при блокировке'}).click();
  await expect(tester).toContainText('Вход при общей блокировке');
  await page.getByLabel('Доступ игроков').selectOption('exempt');await expect(page.locator('.row')).toHaveCount(1);
  await page.getByRole('button',{name:'Доступ к лаунчеру',exact:true}).click();await expect(page.locator('#access-status')).toHaveText('Доступ открыт');
  await page.getByRole('button',{name:'Аккаунты',exact:true}).click();await expect(page.getByLabel('Доступ игроков')).toHaveValue('exempt');
  await tester.getByRole('button',{name:'Закрыть доступ',exact:true}).click();await expect(page.locator('.row')).toHaveCount(0);
  await page.getByRole('button',{name:'Сбросить фильтры'}).click();await expect(page.locator('.row')).toHaveCount(2);
  expect(users[0].launcher_access_exempt).toBe(0);
  await page.evaluate(()=>window.scrollTo(0,0));await page.screenshot({path:info.outputPath('players-access.png')});
  expect((await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa']).analyze()).violations).toEqual([]);
  await page.setViewportSize({width:390,height:844});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.screenshot({path:info.outputPath('players-mobile.png'),fullPage:true});
});

test('Minecraft access has its own settings, drafts and player controls',async({page},info)=>{
  await admin(page);
  let game={closed:false,message:'Готовим сервер'}, saves=0;
  await page.route('**/api/control/minecraft-access',async route=>{
    if(route.request().method()==='PUT'){game=route.request().postDataJSON();saves++;}
    await route.fulfill({json:game});
  });
  const player={id:1,discord_id:'123456789012345678',mc_username:'Tester',discord_username:'Tester',uuid:'uuid',is_whitelisted:1,minecraft_access_blocked:0,minecraft_access_exempt:0};
  await page.route('**/api/control/players**',async route=>{
    if(route.request().method()==='PATCH'){
      const body=route.request().postDataJSON();
      if(body.minecraftBlocked!==undefined){player.minecraft_access_blocked=Number(body.minecraftBlocked);if(body.minecraftBlocked)player.minecraft_access_exempt=0;}
      if(body.minecraftExempt!==undefined)player.minecraft_access_exempt=Number(body.minecraftExempt);
      return route.fulfill({json:{success:true}});
    }
    await route.fulfill({json:{items:[player],total:1,pageSize:30}});
  });
  page.on('dialog',dialog=>dialog.accept());
  await page.goto('/admin/#players/minecraft');
  await expect(page.getByRole('heading',{name:'Запуск Minecraft',exact:true})).toBeVisible();
  await expect(page.getByRole('switch')).not.toBeChecked();
  await page.screenshot({path:info.outputPath('admin-minecraft-open.png'),fullPage:true});
  await page.getByRole('switch').check();await page.getByLabel('Сообщение игрокам').fill('Сезон откроется вечером');
  await page.getByRole('button',{name:'Доступ к лаунчеру',exact:true}).click();
  await expect(page.getByRole('switch')).not.toBeChecked();
  await page.getByLabel('Сообщение игрокам').fill('Черновик лаунчера');
  await page.getByRole('button',{name:'Запуск Minecraft',exact:true}).click();
  await expect(page.getByRole('switch')).toBeChecked();
  await expect(page.getByLabel('Сообщение игрокам')).toHaveValue('Сезон откроется вечером');
  await page.getByRole('button',{name:'Сохранить доступ'}).click();
  await expect(page.locator('#access-status')).toHaveText('Общий доступ закрыт');
  expect(game).toEqual({closed:true,message:'Сезон откроется вечером'});expect(saves).toBe(1);
  await page.screenshot({path:info.outputPath('admin-minecraft-access.png'),fullPage:true});
  expect((await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa']).analyze()).violations).toEqual([]);
  await page.getByRole('button',{name:'Доступ к лаунчеру',exact:true}).click();
  await expect(page.getByLabel('Сообщение игрокам')).toHaveValue('Черновик лаунчера');
  await page.getByRole('button',{name:'Аккаунты',exact:true}).click();
  const row=page.locator('.row');
  await row.getByRole('button',{name:'Разрешить Minecraft при блокировке',exact:true}).click();
  await expect(row).toContainText('Minecraft: исключение из блокировки');
  await row.getByRole('button',{name:'Запретить Minecraft',exact:true}).click();
  await expect(row).toContainText('Запуск Minecraft запрещён');
  await expect(row.getByRole('button',{name:'Разрешить Minecraft при блокировке',exact:true})).toBeDisabled();
  await row.getByRole('button',{name:'Разрешить Minecraft',exact:true}).click();
  await expect(row.getByRole('button',{name:'Разрешить Minecraft при блокировке',exact:true})).toBeEnabled();
  await page.setViewportSize({width:390,height:844});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});
