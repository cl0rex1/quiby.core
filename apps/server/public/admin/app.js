import { readModJar } from './jar.mjs';
const $ = id => document.getElementById(id);
let tab = 'mods', page = 1, selection = null, generation = 0;
const names = { news: ['Новости и рассылки','Публикуйте новости и отправляйте уведомления в лаунчер.'], mods: ['Моды и вайтлист','Рассматривайте заявки и управляйте допуском конкретных файлов.'], players: ['Игроки','Аккаунты Discord, игровые имена и доступ к серверу.'], names: ['Смена ников','Проверяйте заявки перед изменением игрового имени и UUID.'], audit: ['Журнал действий','История решений, принятых через веб-панель.'] };
async function api(path, options = {}) {
  const r = await fetch('/api/control' + path, { ...options, headers: { 'Content-Type': 'application/json', 'X-Quiby-Control': '1', ...options.headers } });
  const body = await r.json().catch(() => ({}));
  if (r.status === 401 && path !== '/login') showLogin();
  if (!r.ok) throw Error(body.error || 'Ошибка сервера: ' + r.status);
  return body;
}
function el(tag, text, className) { const e = document.createElement(tag); if (text !== undefined) e.textContent = text; if (className) e.className = className; return e; }
function showLogin() { $('login').hidden = false; $('app').hidden = true; $('decision').close(); $('news-editor').close(); }
function toast(text) { $('toast').textContent = text; $('toast').hidden = false; setTimeout(() => { $('toast').hidden = true; }, 5000); }
function date(value) { if (!value) return '—'; const d = new Date(value.includes('T') ? value : value.replace(' ','T') + 'Z'); return isNaN(d) ? value : d.toLocaleString('ru-RU'); }
function button(label, action, danger = false) { const b = el('button',label,danger ? 'danger' : ''); b.type='button'; b.onclick=action; return b; }
async function enter() { $('login').hidden=true; $('app').hidden=false; await load(); }
$('login-form').onsubmit = async e => { e.preventDefault(); const b=e.submitter; b.disabled=true; $('login-error').textContent=''; try { await api('/login',{method:'POST',body:JSON.stringify({key:$('key').value})}); $('key').value=''; await enter(); } catch(error) { $('login-error').textContent=error.message; } finally { b.disabled=false; } };
$('logout').onclick=async()=>{try { await api('/logout',{method:'POST',body:'{}'});showLogin(); } catch(e) { toast(e.message); }};
function decide(item, decision) { selection={id:item.id,decision}; $('mod-fields').hidden=true; $('decision-title').textContent=decision==='approved'?'Разрешить':'Отклонить'; $('decision-context').textContent=tab==='mods'?item.mod_name+' · '+item.filename+(item.size_bytes>100*1024*1024?' · Одобрение разрешит этот JAR без полной автоматической распаковки (размер больше 100 МБ).':''):item.current_username+' → '+item.requested_username+' · Изменится UUID; данные Minecraft по старому UUID не переносятся автоматически.'; $('reason').value=''; $('decision-error').textContent=''; $('decision').showModal(); }
$('close-dialog').onclick=()=>$('decision').close();
$('add-mod').onclick=()=>{selection={create:true};$('mod-fields').hidden=false;$('decision-title').textContent='Допуск по SHA-1';$('decision-context').textContent='Решение применяется только к указанному хешу файла.';$('reason').value='';$('decision-error').textContent='';$('decision').showModal();};
$('decision-form').onsubmit=async e=>{e.preventDefault();e.submitter.disabled=true;try{const body={decision:selection.create?$('mod-decision').value:selection.decision,reason:$('reason').value};if(selection.create)Object.assign(body,{name:$('mod-name').value,filename:$('mod-filename').value,hash:$('mod-hash').value.trim()});await api(selection.create?'/mods':'/'+tab+'/'+selection.id,{method:selection.create?'POST':'PATCH',body:JSON.stringify(body)});$('decision').close();toast('Решение сохранено');await load();}catch(error){$('decision-error').textContent=error.message;}finally{e.submitter.disabled=false;}};
async function load() {
  const mine=++generation; $('list').replaceChildren(el('div','Загрузка…','empty'));
  const reviewed = tab==='mods'||tab==='names'; $('status').hidden=!reviewed; $('add-news').hidden=tab!=='news'; $('add-mod').hidden=tab!=='mods'; $('upload-jar').hidden=tab!=='mods';
  $('title').textContent=names[tab][0];$('subtitle').textContent=names[tab][1];
  try {
    const [stats,data]=await Promise.all([api('/overview'),api('/'+tab+'?'+new URLSearchParams({page:String(page),search:$('search').value,status:reviewed?$('status').value:'all'}))]);
    if(mine!==generation)return;
    $('stats').replaceChildren(...[['Игроков',stats.users.total,stats.users.allowed+' с доступом'],['Заявки на моды',stats.mods.pending,'ожидают решения'],['Смена ников',stats.names.pending,'ожидают решения'],['Сборка',stats.pack,'активная версия']].map(([label,value,hint])=>{const box=el('div',undefined,'stat');box.append(el('span',label),el('strong',String(value)),el('span',hint));return box;}));
    const rows=data.items.map(item=>{
      const row=el('article',undefined,'row'), info=el('div',undefined,'info'), actions=el('div',undefined,'actions');
      if(reviewed){info.append(el('span',({pending:'Ожидает',approved:'Одобрено',rejected:'Отклонено'})[item.status], 'badge '+item.status));info.append(el('h3',tab==='mods'?item.mod_name:item.current_username+' → '+item.requested_username));info.append(el('p',item.reason||'Причина не указана'));if(item.auto_detected)info.append(el('p','Автоматически обнаружен у игрока · '+(item.size_bytes/1024/1024).toFixed(1)+' МБ','details'));if(item.size_bytes>100*1024*1024)info.append(el('p','Одобрение создаст исключение по SHA-1 для файла больше 100 МБ.','details'));if(tab==='mods'){info.append(el('p',item.filename,'details'),el('p','SHA-1: '+item.hash_sha1,'details'));}info.append(el('p','#'+item.id+' · '+(item.mc_username||item.discord_id||'')+' · '+date(item.created_at),'details'));if(item.decision_reason)info.append(el('p','Решение: '+item.decision_reason,'details'));if(tab==='mods'||item.status==='pending'){actions.append(button(item.status==='rejected'?'Разрешить повторно':'Одобрить',()=>decide(item,'approved')),button(item.status==='approved'?'Отозвать допуск':'Отклонить',()=>decide(item,'rejected'),true));}}
      else if(tab==='players'){info.append(el('span',item.is_whitelisted?'Доступ разрешён':'Доступ закрыт','badge '+(item.is_whitelisted?'approved':'rejected')),el('h3',item.mc_username),el('p',item.discord_username+' · '+item.discord_id,'details'),el('p','UUID: '+item.uuid,'details'),el('p','Последний вход: '+date(item.last_login_at),'details'));actions.append(button(item.is_whitelisted?'Закрыть доступ':'Разрешить доступ',async()=>{if(!confirm((item.is_whitelisted?'Закрыть':'Разрешить')+' доступ игроку '+item.mc_username+'?'))return;try{await api('/players/'+item.discord_id,{method:'PATCH',body:JSON.stringify({allowed:!item.is_whitelisted})});toast('Доступ обновлён');await load();}catch(e){toast(e.message);}},!!item.is_whitelisted));}
      else if(tab==='news'){info.append(el('span',item.broadcastRevision?'С уведомлением':'В ленте','badge'),el('h3',item.title),el('p',item.excerpt),el('p',item.author+' · '+date(item.date),'details'));actions.append(button('Изменить',()=>editNews(item)),button('Удалить',async()=>{if(!confirm('Удалить новость из ленты? Уже доставленное уведомление останется у читателей.'))return;try{await api('/news/'+encodeURIComponent(item.id),{method:'DELETE'});await load();}catch(e){toast(e.message);}},true));}
      else {info.append(el('h3',item.action+' · '+item.target),el('p',item.details),el('p',date(item.created_at),'details'));}
      row.append(info,actions);return row;
    });
    $('list').replaceChildren(...(rows.length?rows:[el('div','Записей не найдено','empty')]));$('total').textContent='Всего: '+data.total;$('page').textContent=String(page);$('prev').disabled=page===1;$('next').disabled=page*data.pageSize>=data.total;
  } catch(e) {if(mine===generation)$('list').replaceChildren(el('p',e.message,'error'));}
}
for(const b of document.querySelectorAll('[data-tab]'))b.onclick=()=>{tab=b.dataset.tab;page=1;$('search').value='';for(const n of document.querySelectorAll('[data-tab]'))n.classList.toggle('active',n===b);void load();};
let debounce;$('search').oninput=()=>{clearTimeout(debounce);debounce=setTimeout(()=>{page=1;void load();},250);};$('status').onchange=()=>{page=1;void load();};$('prev').onclick=()=>{page--;void load();};$('next').onclick=()=>{page++;void load();};$('refresh').onclick=()=>void load();
setInterval(()=>{if(!$('app').hidden&&!$('decision').open&&!$('news-editor').open&&document.visibilityState==='visible')void load();},30000);
api('/session').then(enter).catch(showLogin);

$('upload-jar').onclick=()=>$('jar-file').click();
$('jar-file').onchange=async()=>{
  const file=$('jar-file').files[0]; if(!file)return;
  $('upload-jar').disabled=true;
  try {
    const mod=await readModJar(file);
    $('add-mod').click();
    $('mod-name').value=mod.name; $('mod-filename').value=mod.filename; $('mod-hash').value=mod.hash;
    $('decision-title').textContent='Добавить мод';
    $('decision-context').textContent=mod.name+(mod.version?' · '+mod.version:'')+' — файл обработан в браузере и не отправляется на сервер.'+(file.size>100*1024*1024?' Одобрение создаст исключение размера для этого JAR.':'');
  } catch(e){toast(e.message||'Не удалось прочитать JAR');}
  finally{$('upload-jar').disabled=false;$('jar-file').value='';}
};

let editedNewsId = null;
function editNews(item = {}) {
  editedNewsId = item.id || null;
  $('news-title').value=item.title || ''; $('news-excerpt').value=item.excerpt || '';
  $('news-content').value=item.content || ''; $('news-author').value=item.author || 'quiby';
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
    await api('/news'+(editedNewsId?'/'+encodeURIComponent(editedNewsId):''),{method:editedNewsId?'PUT':'POST',body:JSON.stringify({title:$('news-title').value,excerpt:$('news-excerpt').value,content:$('news-content').value,author:$('news-author').value,tag:$('news-tag').value,pin:$('news-pin').checked,broadcast:$('news-broadcast').checked})});
    $('news-editor').close(); toast('Новость опубликована'); await load();
  } catch(error) { $('news-error').textContent=error.message; }
  finally { submit.disabled=false; }
};
