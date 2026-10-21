import {test,expect,boot,emit} from './fixtures';

test('playtime restores from the account after all local counters are removed',async({page})=>{
  await boot(page);const stored=page.waitForResponse(response=>response.url().endsWith('/api/game/playtime')&&response.request().postDataJSON()?.totalSeconds===120);
  await emit(page,'onPlaytimeTick',120);await (await stored).finished();
  await expect(page.getByLabel('Время в игре')).toContainText('2 мин');
  await expect.poll(()=>page.evaluate(()=>JSON.parse(localStorage.getItem('quiby_playtime_fixture')||'{}').totalSeconds)).toBe(120);
  await page.evaluate(()=>{for(const key of Object.keys(localStorage))if(key.startsWith('quiby_playtime_')||key==='quiby_total_playtime')localStorage.removeItem(key);});
  await page.reload();await expect(page.getByLabel('Время в игре')).toContainText('2 мин');
});

test('offline time retries without double counting and the legacy counter imports once',async({page})=>{
  await page.addInitScript(()=>{if(!localStorage.getItem('fixture-time-seeded')){localStorage.setItem('quiby_total_playtime','180');localStorage.setItem('fixture-time-seeded','1');}});
  let offline=true;await page.route('**/api/game/playtime',route=>offline?route.abort():route.fallback());
  await boot(page);await emit(page,'onPlaytimeTick',60);
  await expect(page.getByLabel('Время в игре')).toContainText('4 мин');
  await page.reload();await expect(page.getByLabel('Время в игре')).toContainText('4 мин');
  offline=false;const sync=page.waitForResponse('**/api/game/playtime');await page.evaluate(()=>window.dispatchEvent(new Event('focus')));await (await sync).finished();
  await expect(page.getByLabel('Время в игре')).toContainText('4 мин');
  await page.reload();await expect(page.getByLabel('Время в игре')).toContainText('4 мин');
});

test('signout is unavailable while a game owns the playtime counter',async({page})=>{
  await boot(page);await emit(page,'onLaunchStateChange',{status:'running'});
  await page.getByLabel('Профиль: QuibyPlayer',{exact:true}).click();await expect(page.getByRole('button',{name:'Выйти из аккаунта'})).toBeDisabled();
});
