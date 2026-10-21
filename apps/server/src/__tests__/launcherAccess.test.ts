import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import express from 'express';
import jwt from 'jsonwebtoken';
import { MINIMUM_LAUNCHER_VERSION } from '@quiby/shared';

test('global launcher access persists, blocks existing sessions and OAuth, and leaves control usable', async () => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'quiby-access-'));
  process.env.DB_PATH = path.join(directory, 'test.sqlite'); process.env.STORAGE_PATH = directory;
  const { config } = await import('../config'); config.adminApiKey = 'access-test-key';
  const { initDatabase, dbRun, closeDatabase } = await import('../models/db'); await initDatabase();
  const { getLauncherAccess } = await import('../services/launcherAccess');
  const {getPlayerLauncherAccess}=await import('../services/launcherAccess');
  const {sessionDiscordId}=await import('../middleware/auth');
  const app = express(); app.use(express.json());
  app.use('/api/control', (await import('../routes/control')).default);
  app.use('/api/auth', (await import('../routes/auth')).default);
  app.use('/api/game', (await import('../routes/game')).default);
  app.get('/api/launcher/access', async (req,res) => res.json(await getPlayerLauncherAccess(sessionDiscordId(req))));
  const server = app.listen(0, '127.0.0.1'); await new Promise<void>(resolve => server.once('listening',resolve));
  const base = 'http://127.0.0.1:' + (server.address() as {port:number}).port;
  const headers = { 'Content-Type':'application/json', 'X-Quiby-Control':'1', 'x-quiby-launcher-version':MINIMUM_LAUNCHER_VERSION };
  try {
    assert.equal((await getLauncherAccess()).closed, false);
    assert.equal((await fetch(base+'/api/control/launcher-access', {method:'PUT',headers,body:JSON.stringify({closed:true})})).status,401);
    const login = await fetch(base+'/api/control/login',{method:'POST',headers,body:JSON.stringify({key:config.adminApiKey})});
    const admin = {...headers,Cookie:login.headers.get('set-cookie')!.split(';')[0]};
    await dbRun('INSERT INTO users(discord_id,discord_username,mc_username,uuid,is_whitelisted) VALUES(?,?,?,?,1)', ['123456789012345678','Tester','Tester','f4606112-bd19-394a-bd0b-0b7f6f6a5001']);
    const token = jwt.sign({discordId:'123456789012345678',mcUsername:'Tester',authMethod:'discord'},config.jwtSecret);
    const player = {...headers,Authorization:'Bearer '+token};
    assert.equal((await fetch(base+'/api/auth/me',{headers:player})).status,200);
    const change = (body:object, overrides={}) => fetch(base+'/api/control/launcher-access',{method:'PUT',headers:{...admin,...overrides},body:JSON.stringify(body)});
    assert.equal((await change({closed:true},{Origin:'https://evil.example'})).status,403);
    assert.equal((await change({closed:'yes'})).status,400);
    assert.equal((await change({closed:true,message:'Обновляем сервер'})).status,200);
    await initDatabase(); assert.equal((await getLauncherAccess()).closed,true);
    const status = await fetch(base+'/api/launcher/access'); assert.equal((await status.json()).message,'Обновляем сервер');
    for (const route of ['/api/auth/me','/api/auth/discord/url','/api/auth/discord/callback','/api/game/join-ticket']) {
      const response = await fetch(base+route,{headers:player,...(route.includes('callback')||route.includes('join-ticket')?{method:'POST',body:'{}'}:{})});
      assert.equal(response.status,503,route); assert.equal((await response.json()).code,'LAUNCHER_ACCESS_CLOSED');
    }
    assert.equal((await fetch(base+'/api/control/session',{headers:admin})).status,200);
    const updatePlayer=(body:object)=>fetch(base+'/api/control/players/123456789012345678',{method:'PATCH',headers:admin,body:JSON.stringify(body)});
    assert.equal((await updatePlayer({launcherExempt:true})).status,200);
    await initDatabase();
    assert.equal((await fetch(base+'/api/auth/me',{headers:player})).status,200);
    assert.equal((await (await fetch(base+'/api/launcher/access',{headers:player})).json()).closed,false);
    assert.equal((await (await fetch(base+'/api/launcher/access')).json()).canLogin,true);
    const binding=jwt.sign({discordId:'123456789012345678',mcUsername:'Tester',purpose:'mc_binding'},config.jwtSecret);
    for(const auth of ['Bearer '+binding,'Bearer '+token+'tampered'])assert.equal((await (await fetch(base+'/api/launcher/access',{headers:{Authorization:auth}})).json()).closed,true);
    assert.equal((await (await fetch(base+'/api/launcher/access',{headers:{'x-discord-id':'123456789012345678'}})).json()).closed,true);
    await dbRun('INSERT INTO users(discord_id,discord_username,mc_username,uuid) VALUES(?,?,?,?)',['223456789012345678','Other','Other','other-uuid']);
    const otherToken=jwt.sign({discordId:'223456789012345678',mcUsername:'Other',authMethod:'discord'},config.jwtSecret);
    assert.equal((await fetch(base+'/api/auth/me',{headers:{...headers,Authorization:'Bearer '+otherToken}})).status,503);
    Object.assign(config.discord,{clientId:'test-client',clientSecret:'test-secret',botToken:'test-bot',guildId:'test-guild',requiredRoleId:''});
    assert.equal((await fetch(base+'/api/auth/discord/url',{headers})).status,200);
    const realFetch=globalThis.fetch;let discordId='223456789012345678';
    globalThis.fetch=async(url,options)=>{
      const target=String(url);
      if(target.startsWith('https://discord.com/api/'))return Response.json(target.endsWith('/token')?{access_token:'mock-oauth'}:target.endsWith('/@me')?{id:discordId,username:'Tester',discriminator:'0'}:{roles:[]});
      return realFetch(url,options);
    };
    try {
      const callback=()=>fetch(base+'/api/auth/discord/callback',{method:'POST',headers,body:JSON.stringify({code:'mock-code',discordId:'123456789012345678'})});
      assert.equal((await callback()).status,503,'A supplied Discord ID cannot bypass the verified OAuth identity');
      discordId='123456789012345678';const allowedLogin=await callback();assert.equal(allowedLogin.status,200);assert.ok((await allowedLogin.json()).session.token);
    }finally{globalThis.fetch=realFetch;}
    const exceptions=await(await fetch(base+'/api/control/players?access=exempt',{headers:admin})).json();assert.equal(exceptions.total,1);
    assert.equal((await updatePlayer({allowed:false})).status,200);
    assert.equal((await fetch(base+'/api/auth/me',{headers:player})).status,403);
    assert.equal((await updatePlayer({launcherExempt:true})).status,400);
    assert.equal((await updatePlayer({allowed:true})).status,200);
    assert.equal((await fetch(base+'/api/auth/me',{headers:player})).status,503,'Reopening personal access does not restore a revoked exception');
    assert.equal((await (await fetch(base+'/api/launcher/access')).json()).canLogin,false);
    assert.equal((await change({closed:false,message:''})).status,200);
    assert.equal((await fetch(base+'/api/auth/me',{headers:player})).status,200);
    const audit = await (await fetch(base+'/api/control/audit',{headers:admin})).json();
    const actions=audit.items.map((row:any)=>row.action);assert.equal(actions[0],'launcher:open');assert.ok(actions.includes('launcher:close')&&actions.includes('players:exempt')&&actions.includes('players:block'));
  } finally { await new Promise<void>(resolve=>server.close(()=>resolve()));await closeDatabase();await fs.rm(directory,{recursive:true,force:true}); }
});
