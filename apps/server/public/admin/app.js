import { readModJar, readResourcePackZip } from './jar.mjs?v=20261021-3';
const $ = id => document.getElementById(id);
let tab = 'mods', page = 1, selection = null, generation = 0, category='all';
let requestController, busy = false, renderedKey = '', renderedData = '', toastTimer;
let accessState = null, accessSaving = false;
const filters = new Map();
const names = { access: ['Доступ к лаунчеру','Общая блокировка и исключения для игроков.'], news: ['Новости и рассылки','Публикуйте новости и отправляйте уведомления в лаунчер.'], mods: ['Вайтлист контента','Моды, ресурспаки и решения по конкретным файлам.'], players: ['Игроки','Личный доступ, исключения из общей блокировки и время в игре.'], names: ['Смена ников','Проверяйте заявки перед изменением игрового имени и UUID.'], audit: ['Журнал действий','История решений, принятых через веб-панель.'] };
async function api(path, options = {}) {
  try {
    const r = await fetch('/api/control' + path, { ...options, cache: 'no-store', credentials: 'same-origin',
      signal: options.signal ? AbortSignal.any([options.signal, AbortSignal.timeout(15000)]) : AbortSignal.timeout(15000),
      headers: { 'Content-Type': 'application/json', 'X-Quiby-Control': '1', ...options.headers } });
    const body = await r.json().catch(() => { throw Error('Сервер вернул неожиданный ответ. Повторите запрос.'); });
    if (r.status === 401 && path !== '/login') { const expired=!$('app').hidden;showLogin();if(expired)$('login-error').textContent='Сессия завершилась. Войдите снова.'; }
    if (!r.ok) { const error=Error(body.error || 'Ошибка сервера: ' + r.status);error.status=r.status;throw error; }
    return body;
  } catch (error) {
    if (error.name === 'TimeoutError') throw Error('Сервер не ответил вовремя. Попробуйте ещё раз.');
    if (error instanceof TypeError) throw Error('Нет связи с сервером. Проверьте подключение и повторите запрос.');
    throw error;
  }
}
function el(tag, text, className) { const e = document.createElement(tag); if (text !== undefined) e.textContent = text; if (className) e.className = className; return e; }
function showLogin() { generation++; requestController?.abort(); busy=false; accessState=null;renderedKey='';renderedData='';$('login').hidden = false; $('app').hidden = true; $('decision').close(); $('news-editor').close(); }
function toast(text) { clearTimeout(toastTimer); $('toast').textContent = text; $('toast').hidden = false; toastTimer=setTimeout(() => { $('toast').hidden = true; }, 5000); }
function date(value) { if (!value) return '—'; const d = new Date(value.includes('T') ? value : value.replace(' ','T') + 'Z'); return isNaN(d) ? value : d.toLocaleString('ru-RU'); }
function button(label, action, danger = false) { const b = el('button',label,danger ? 'danger' : ''); b.type='button'; b.onclick=action; return b; }
function copyButton(value,label) { return button(label,async()=>{try{await navigator.clipboard.writeText(value);toast('Скопировано');}catch{toast('Не удалось скопировать. Выделите текст вручную.');}}); }
function timePlayed(seconds=0){const minutes=Math.floor(seconds/60);return Math.floor(minutes/60)+' ч '+minutes%60+' мин';}
async function changePlayer(item,body) {
  const message=body.launcherExempt===undefined?(body.allowed?'Разрешить личный доступ':'Закрыть личный доступ и убрать исключение'):body.launcherExempt?'Разрешить вход при общей блокировке':'Убрать исключение из общей блокировки';
  if(!confirm(message+' игроку '+item.mc_username+'?'))return;
  try{await api('/players/'+item.discord_id,{method:'PATCH',body:JSON.stringify(body)});toast('Доступ игрока обновлён');await load();}catch(error){toast(error.message);}
}
async function enter() { $('login').hidden=true; $('app').hidden=false; navigate(location.hash.slice(1)||tab,undefined,true); }
$('login-form').onsubmit = async e => { e.preventDefault(); const b=e.submitter; b.disabled=true; $('login-error').textContent=''; try { await api('/login',{method:'POST',body:JSON.stringify({key:$('key').value})}); $('key').value=''; await enter(); } catch(error) { $('login-error').textContent=error.message; } finally { b.disabled=false; } };
$('logout').onclick=async()=>{try { await api('/logout',{method:'POST',body:'{}'});showLogin(); } catch(e) { toast(e.message); }};
function decide(item, decision) { selection={id:item.id,decision}; $('mod-fields').hidden=true; $('decision-title').textContent=decision==='approved'?'Разрешить':'Отклонить'; $('decision-context').textContent=tab==='mods'?item.mod_name+' · '+item.filename+(item.size_bytes>100*1024*1024?' · Одобрение разрешит этот JAR без полной автоматической распаковки (размер больше 100 МБ).':''):item.current_username+' → '+item.requested_username+' · Изменится UUID; данные Minecraft по старому UUID не переносятся автоматически.'; $('reason').value=''; $('decision-error').textContent=''; $('decision').showModal(); }
$('close-dialog').onclick=()=>$('decision').close();
$('add-mod').onclick=()=>{selection={create:true};$('mod-fields').hidden=false;$('decision-title').textContent='Допуск по SHA-1';$('decision-context').textContent='Решение применяется только к указанному хешу файла.';$('reason').value='';$('decision-error').textContent='';$('decision').showModal();};
$('decision-form').onsubmit=async e=>{e.preventDefault();e.submitter.disabled=true;try{const body={decision:selection.create?$('mod-decision').value:selection.decision,reason:$('reason').value};if(selection.create)Object.assign(body,{name:$('mod-name').value,filename:$('mod-filename').value,hash:$('mod-hash').value.trim()});await api(selection.create?'/mods':'/'+tab+'/'+selection.id,{method:selection.create?'POST':'PATCH',body:JSON.stringify(body)});$('decision').close();toast('Решение сохранено');await load();}catch(error){$('decision-error').textContent=error.message;}finally{e.submitter.disabled=false;}};
function renderRows(data, reviewed) {
    const rows=data.items.map(item=>{
      const row=el('article',undefined,'row'), info=el('div',undefined,'info'), actions=el('div',undefined,'actions');
      if(reviewed){info.append(el('span',(tab==='mods'?(/\.zip$/i.test(item.filename)?'Ресурспак · ':/\.jar$/i.test(item.filename)?'Мод · ':'Другое · '):'')+({pending:'Ожидает',approved:'Одобрено',rejected:'Отклонено'})[item.status], 'badge '+item.status));info.append(el('h3',tab==='mods'?item.mod_name:item.current_username+' → '+item.requested_username));info.append(el('p',item.reason||'Причина не указана'));if(item.auto_detected)info.append(el('p','Автоматически обнаружен у игрока · '+(item.size_bytes/1024/1024).toFixed(1)+' МБ','details'));if(item.size_bytes>100*1024*1024)info.append(el('p','Одобрение создаст исключение по SHA-1 для файла больше 100 МБ.','details'));if(tab==='mods'){info.append(el('p',item.filename,'details'),el('p','SHA-1: '+item.hash_sha1,'details'));}info.append(el('p','#'+item.id+' · '+(item.mc_username||item.discord_id||'')+' · '+date(item.created_at),'details'));if(item.decision_reason)info.append(el('p','Решение: '+item.decision_reason,'details'));if(tab==='mods'||item.status==='pending'){actions.append(button(item.status==='rejected'?'Разрешить повторно':'Одобрить',()=>decide(item,'approved')),button(item.status==='approved'?'Отозвать допуск':'Отклонить',()=>decide(item,'rejected'),true));}}
      else if(tab==='players') {
        info.append(el('span',item.is_whitelisted?'Личный доступ открыт':'Личный доступ закрыт','badge '+(item.is_whitelisted?'approved':'rejected')),el('h3',item.mc_username));
        if(item.launcher_access_exempt && item.is_whitelisted)info.append(el('span','Вход при общей блокировке','badge exempt'));
        info.append(el('p',item.discord_username+' · '+item.discord_id,'details'),el('p','UUID: '+item.uuid,'details'),el('p','Наиграно: '+timePlayed(item.playtime_seconds)+' · Последний вход: '+date(item.last_login_at),'details'));
        const exemption=button(item.launcher_access_exempt?'Убрать исключение':'Разрешить при блокировке',()=>changePlayer(item,{launcherExempt:!item.launcher_access_exempt}));
        exemption.disabled=!item.is_whitelisted;exemption.title=!item.is_whitelisted?'Сначала разрешите личный доступ':'';
        actions.append(button(item.is_whitelisted?'Закрыть доступ':'Разрешить доступ',()=>changePlayer(item,{allowed:!item.is_whitelisted}),!!item.is_whitelisted),exemption,copyButton(item.discord_id,'Копировать Discord ID'));
      }
      else if(tab==='news'){info.append(el('span',item.broadcastRevision?'С уведомлением':'В ленте','badge'),el('h3',item.title),el('p',item.excerpt),el('p',item.author+' · '+date(item.date),'details'));actions.append(button('Изменить',()=>editNews(item)),button('Удалить',async()=>{if(!confirm('Удалить новость из ленты? Уже доставленное уведомление останется у читателей.'))return;try{await api('/news/'+encodeURIComponent(item.id),{method:'DELETE'});await load();}catch(e){toast(e.message);}},true));}
      else {const labels={'resourcepacks:approved':'Ресурспак разрешён','resourcepacks:rejected':'Ресурспак отклонён','players:exempt':'Добавлено исключение доступа','players:unexempt':'Убрано исключение доступа','mods:approved':'Мод разрешён','mods:rejected':'Мод отклонён','names:approved':'Смена ника одобрена','names:rejected':'Смена ника отклонена','players:allow':'Доступ игроку открыт','players:block':'Доступ игроку закрыт','news:save':'Новость сохранена','news:broadcast':'Новость с уведомлением','news:delete':'Новость удалена','launcher:close':'Доступ к лаунчеру закрыт','launcher:open':'Доступ к лаунчеру открыт'};info.append(el('h3',labels[item.action]||item.action),el('p',item.details),el('p',(item.target==='all'?'Все игроки':item.target)+' · '+date(item.created_at),'details'));}
      if(tab==='mods')actions.append(copyButton(item.hash_sha1,'Копировать SHA-1'));
      row.append(info,actions);return row;
    });
  return rows;
}
function connection(text, state = '') {
  $('connection-status').textContent = text;
  $('connection-status').dataset.state = state;
}
function accessDirty() {
  return !!accessState && (accessState.closed !== $('access-closed').checked || accessState.message !== $('access-message').value);
}
function updateAccessDraft() {
  const dirty = accessDirty(), closed = $('access-closed').checked;
  $('access-counter').textContent = $('access-message').value.length + ' / 500';
  $('access-draft').textContent = dirty ? 'Есть несохранённые изменения' : 'Все изменения сохранены';
  $('access-draft').dataset.dirty = String(dirty);
  $('access-save').disabled = !dirty || accessSaving || $('access-fields').disabled;
  $('access-preview-title').textContent = closed ? 'Доступ временно закрыт' : 'Лаунчер доступен';
  $('access-preview-message').textContent = closed ? ($('access-message').value.trim() || 'Доступ к лаунчеру временно закрыт. Попробуйте позже.') : 'Игроки могут войти и запустить игру.';
}
function showAccess(state) {
  accessState = state;
  $('access-closed').checked = state.closed;
  $('access-message').value = state.message;
  $('access-status').textContent = state.closed ? 'Общий доступ закрыт' : 'Доступ открыт';
  $('access-state-badge').textContent = state.closed ? 'Закрыт' : 'Открыт';
  $('access-state-badge').className = 'badge ' + (state.closed ? 'rejected' : 'approved');
  $('access-updated').textContent = state.updatedAt ? 'Последнее изменение: ' + date(state.updatedAt) : 'Игроки могут войти и запустить игру.';
  $('access-error').textContent = '';
  updateAccessDraft();
}
function emptyList(filtered) {
  const empty = el('div', undefined, 'empty');
  empty.append(el('strong', filtered ? 'Ничего не найдено' : ({mods:'Новых заявок нет',names:'Заявок на смену ника нет',news:'Пока нет новостей',players:'Игроки ещё не заходили',audit:'Здесь появится история действий'})[tab]),
    el('p', filtered ? 'Попробуйте другое название или измените фильтр.' : 'Записи появятся здесь, когда будут доступны.'));
  if (filtered) empty.append(button('Сбросить фильтры', () => { $('search').value='';$('status').value='all';$('player-filter').value='all';if(tab==='mods')category='all';page=1;history.replaceState(null,'','#'+tab);void load(); }));
  if (tab==='news' && !filtered) empty.append(button('Написать первую новость', () => editNews()));
  return empty;
}
function updateStats(stats) {
  const signature = JSON.stringify(stats);
  if ($('stats').dataset.signature === signature) return;
  $('stats').dataset.signature = signature;
  $('stats').replaceChildren(...[
    ['Игроков',stats.users.total,stats.users.allowed+' с доступом','players'],
    ['Заявки контента',stats.mods.pending,'ожидают решения','mods'],
    ['Смена ников',stats.names.pending,'ожидают решения','names'],
    ['Сборка',stats.pack,'активная версия',null],
  ].map(([label,value,hint,target]) => {
    const box=target?button('',()=>navigate(target==='mods'?'mods/all':target, target==='mods'||target==='names' ? 'pending' : undefined)):el('div');
    box.className='stat';box.append(el('span',label),el('strong',String(value)),el('span',hint));return box;
  }));
  for (const kind of ['mods','names']) { $(kind+'-count').textContent=String(stats[kind].pending);$(kind+'-count').hidden=!stats[kind].pending; }
}
async function load({ silent = false } = {}) {
  if (silent && busy) return;
  requestController?.abort();
  busy=false;$('refresh').disabled=false;
  const controller = requestController = new AbortController(), mine = ++generation, currentTab=tab;
  const reviewed = tab==='mods'||tab==='names', isAccess=tab==='access';
  document.querySelector('.footnote').hidden=isAccess;
  $('records-panel').hidden=isAccess;$('access-panel').hidden=!isAccess;$('stats').hidden=isAccess;
  $('players-tabs').hidden=tab!=='players'&&!isAccess;$('content-categories').hidden=tab!=='mods';$('player-filter').hidden=tab!=='players';
  for(const b of document.querySelectorAll('[data-player-tab]'))b.setAttribute('aria-pressed',String(b.dataset.playerTab===tab));
  for(const b of document.querySelectorAll('[data-category]'))b.setAttribute('aria-pressed',String(b.dataset.category===category));
  $('status').hidden=!reviewed;$('add-news').hidden=tab!=='news';$('add-mod').hidden=tab!=='mods';$('upload-jar').hidden=tab!=='mods';
  $('title').textContent=names[tab][0];$('subtitle').textContent=names[tab][1];document.title=names[tab][0]+' · quiby';
  $('load-error').hidden=true;
  if (isAccess && accessDirty()) { updateAccessDraft();connection('Есть несохранённые изменения');return; }
  busy=true;$('refresh').disabled=true;$('load-error').hidden=true;connection('Обновляем…','loading');
  const key = [tab,category,page,$('search').value,reviewed?$('status').value:'all',$('player-filter').value].join('|');
  if (isAccess) { $('access-fields').disabled=true;$('access-save').disabled=true;$('access-loading').hidden=false; }
  else if (renderedKey!==key) {
    const placeholder=el('div',undefined,'loading-placeholder');placeholder.setAttribute('aria-label','Загрузка записей');
    placeholder.append(...Array.from({length:3},()=>el('div',undefined,'skeleton')));$('list').replaceChildren(placeholder);$('list').setAttribute('aria-busy','true');
    $('prev').disabled=true;$('next').disabled=true;
  }
  try {
    if (isAccess) {
      const state=await api('/launcher-access',{signal:controller.signal});
      if (mine!==generation)return;
      if(typeof state.closed!=='boolean'||typeof state.message!=='string')throw Error('Не удалось прочитать настройки доступа. Повторите запрос.');
      showAccess(state);$('access-fields').disabled=false;updateAccessDraft();
    } else {
      const [stats,data]=await Promise.all([api('/overview',{signal:controller.signal}),api('/'+currentTab+'?'+new URLSearchParams({page:String(page),search:$('search').value,status:reviewed?$('status').value:'all',category:tab==='mods'?category:'all',access:tab==='players'?$('player-filter').value:'all'}),{signal:controller.signal})]);
      if(mine!==generation)return;
      updateStats(stats);
      if(tab==='mods')for(const kind of ['all','mods','resourcepacks','other']){
        $('category-'+kind).textContent=String(data.categories?.[kind]||0);
        if(kind==='other')$('category-other').parentElement.hidden=!data.categories?.other&&category!=='other';
      }
      const signature=JSON.stringify(data);
      if (renderedKey!==key || renderedData!==signature) {
        const rows = renderRows(data, reviewed);
        $('list').replaceChildren(...(rows.length?rows:[emptyList(!!$('search').value || (reviewed && $('status').value!=='pending') || (tab==='mods'&&category!=='all') || (tab==='players'&&$('player-filter').value!=='all'))]));
        renderedKey=key;renderedData=signature;
      }
      const start=data.total?(page-1)*data.pageSize+1:0,end=Math.min(page*data.pageSize,data.total);
      $('total').textContent=data.total?`${start}–${end} из ${data.total}`:'Всего: 0';
      $('page').textContent=`${page} / ${Math.max(1,Math.ceil(data.total/data.pageSize))}`;
      $('prev').disabled=page===1;$('next').disabled=page*data.pageSize>=data.total;
    }
    connection('Обновлено '+new Date().toLocaleTimeString('ru-RU',{hour:'2-digit',minute:'2-digit'}));
  } catch (error) {
    if (mine!==generation || controller.signal.aborted) return;
    $('load-error-text').textContent=error.message;$('load-error').hidden=false;connection('Ошибка подключения','error');
    if (!isAccess && renderedKey!==key) { $('list').replaceChildren(el('div','Не удалось загрузить записи. Нажмите «Повторить» выше.','empty'));renderedKey='';renderedData=''; }
  } finally {
    if (mine===generation) { busy=false;$('refresh').disabled=false;$('list').setAttribute('aria-busy','false');$('access-loading').hidden=true; }
  }
}
function navigate(nextTab, status, fromHistory=false) {
  const [section,subsection]=nextTab.split('/');
  nextTab=section==='players'&&subsection==='access'?'access':section;
  if (!names[nextTab])nextTab='mods';
  clearTimeout(debounce);
  filters.set(tab==='mods'?tab+':'+category:tab,{search:$('search').value,status:$('status').value,access:$('player-filter').value,page});
  if(nextTab==='mods'&&!subsection&&fromHistory)category='all';
  if(nextTab==='mods'&&['all','mods','resourcepacks','other'].includes(subsection))category=subsection;
  tab=nextTab;
  const saved=filters.get(tab==='mods'?tab+':'+category:tab);
  page=status?1:saved?.page||1;$('search').value=saved?.search||'';$('status').value=status||saved?.status||'pending';
  $('player-filter').value=saved?.access||'all';
  for(const button of document.querySelectorAll('[data-tab]')){
    const active=button.dataset.tab===(tab==='access'?'players':tab);button.classList.toggle('active',active);
    if(active)button.setAttribute('aria-current','page');else button.removeAttribute('aria-current');
  }
  document.querySelector('[aria-current="page"]')?.scrollIntoView({block:'nearest',inline:'nearest'});
  window.scrollTo({top:0});
  const route=tab==='access'?'players/access':tab==='mods'&&category!=='all'?'mods/'+category:tab;
  if(location.hash.slice(1)!==route)history[fromHistory?'replaceState':'pushState'](null,'','#'+route);
  void load();
}
for (const button of document.querySelectorAll('[data-tab]')) button.onclick=()=>navigate(button.dataset.tab);
for(const b of document.querySelectorAll('[data-player-tab]'))b.onclick=()=>navigate(b.dataset.playerTab);
for(const b of document.querySelectorAll('[data-category]'))b.onclick=()=>navigate('mods/'+b.dataset.category);
let debounce;
$('search').oninput=()=>{clearTimeout(debounce);debounce=setTimeout(()=>{page=1;void load();},250);};
$('status').onchange=()=>{clearTimeout(debounce);page=1;void load();};
$('player-filter').onchange=()=>{page=1;void load();};
$('prev').onclick=()=>{page--;void load();};$('next').onclick=()=>{page++;void load();};
async function refresh() {
  if(tab==='access'&&accessDirty()) {
    if(!confirm('Обновить настройки с сервера? Несохранённые изменения будут потеряны.'))return;
    showAccess(accessState);
  }
  await load();
}
$('refresh').onclick=refresh;$('retry').onclick=refresh;
$('access-closed').onchange=updateAccessDraft;$('access-message').oninput=updateAccessDraft;
window.addEventListener('popstate',()=>navigate(location.hash.slice(1),undefined,true));
window.addEventListener('beforeunload',event=>{if(accessDirty()){event.preventDefault();event.returnValue='';}});
document.addEventListener('keydown',event=>{
  if(event.key==='/'&&!event.ctrlKey&&!event.metaKey&&!$('app').hidden&&tab!=='access'&&!document.querySelector('dialog[open]')&&!event.target.closest('input,textarea,select,[contenteditable]')){event.preventDefault();$('search').focus();}
});
// Polling never clears a list or touches an editor, and unchanged data keeps its DOM.
setInterval(()=>{
  if(tab!=='access'&&!$('app').hidden&&!document.querySelector('dialog[open]')&&document.visibilityState==='visible'&&!document.activeElement.closest('input,textarea,select,[contenteditable]'))void load({silent:true});
},60000);

$('upload-jar').onclick=()=>$('jar-file').click();
$('jar-file').onchange=async()=>{
  const file=$('jar-file').files[0]; if(!file)return;
  $('upload-jar').disabled=true;
  try {
    const pack=/\.zip$/i.test(file.name),mod=await (pack?readResourcePackZip(file):readModJar(file));
    $('add-mod').click();
    $('mod-name').value=mod.name; $('mod-filename').value=mod.filename; $('mod-hash').value=mod.hash;
    $('decision-title').textContent=pack?'Добавить ресурспак':'Добавить мод';
    $('decision-context').textContent=mod.name+(mod.version?' · '+mod.version:'')+' — файл обработан в браузере и не отправляется на сервер.'+(file.size>100*1024*1024?' Одобрение создаст исключение размера для этого JAR.':'');
  } catch(e){toast(e.message||'Не удалось прочитать JAR');}
  finally{$('upload-jar').disabled=false;$('jar-file').value='';}
};

let editedNewsId = null;
function editNews(item = {}) {
  editedNewsId = item.id || null;
  $('news-title').value=item.title || ''; $('news-excerpt').value=item.excerpt || '';
  $('news-content').value=item.content || ''; $('news-banner').value=item.bannerUrl || ''; $('news-preview').hidden=true; $('news-author').value=item.author || 'quiby';
  $('news-tag').value=item.tag || 'announcement'; $('news-pin').checked=Boolean(item.pin);
  $('news-broadcast').checked=false; $('news-error').textContent='';
  $('news-editor-title').textContent=item.id?'Редактировать новость':'Новая новость';
  $('news-editor').showModal();
}
$('add-news').onclick=()=>editNews();
$('close-news').onclick=()=>$('news-editor').close();
$('news-form').onsubmit=async event=>{
  event.preventDefault(); const submit=event.submitter; submit.disabled=true;
  try {
    await api('/news'+(editedNewsId?'/'+encodeURIComponent(editedNewsId):''),{method:editedNewsId?'PUT':'POST',body:JSON.stringify({title:$('news-title').value,excerpt:$('news-excerpt').value,content:$('news-content').value,bannerUrl:$('news-banner').value,author:$('news-author').value,tag:$('news-tag').value,pin:$('news-pin').checked,broadcast:$('news-broadcast').checked})});
    $('news-editor').close(); toast('Новость опубликована'); await load();
  } catch(error) { $('news-error').textContent=error.message; }
  finally { submit.disabled=false; }
};

for (const button of document.querySelectorAll('[data-format]')) button.onclick = () => {
  const field=$('news-content'), start=field.selectionStart, end=field.selectionEnd, selected=field.value.slice(start,end);
  const sample={bold:'**'+(selected||'Текст')+'**',heading:'\n## '+(selected||'Заголовок')+'\n',list:'\n- '+(selected||'Пункт списка')+'\n',image:'\n![Описание](https://example.com/image.png)\n',video:'\n![Видео](https://example.com/video.mp4)\n',link:'['+(selected||'Ссылка')+'](https://example.com)'}[button.dataset.format];
  field.setRangeText(sample,start,end,'select');field.focus();
};
$('preview-news').onclick=async()=>{try{const result=await api('/news/preview',{method:'POST',body:JSON.stringify({content:$('news-content').value})});$('news-preview').srcdoc='<meta charset="utf-8"><style>body{background:#141417;color:#eee;font:15px/1.7 system-ui;padding:20px}img,video,iframe{max-width:100%;border-radius:10px}a{color:#c8a6ef}blockquote{border-left:2px solid #a775da;padding-left:14px}table{border-collapse:collapse}td,th{border:1px solid #444;padding:8px}pre{overflow:auto;background:#222;padding:12px}</style>'+result.html;$('news-preview').hidden=false;}catch(error){$('news-error').textContent=error.message;}};

$('access-form').onsubmit=async event=>{
  event.preventDefault();if(!accessDirty()||accessSaving||$('access-fields').disabled)return;
  accessSaving=true;$('access-save').disabled=true;$('access-save').textContent='Сохраняем…';$('access-fields').disabled=true;$('refresh').disabled=true;$('access-error').textContent='';
  try {
    const state=await api('/launcher-access',{method:'PUT',body:JSON.stringify({closed:$('access-closed').checked,message:$('access-message').value})});
    showAccess(state);toast('Доступ обновлён');
  } catch(error) { $('access-error').textContent=error.message; }
  finally { accessSaving=false;$('access-fields').disabled=!accessState;$('refresh').disabled=false;$('access-save').textContent='Сохранить доступ';updateAccessDraft(); }
};

api('/session').then(enter).catch(error=>{showLogin();if(error.status!==401)$('login-error').textContent=error.message;});
