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
  const app = express(); app.use(express.json());
  app.use('/api/control', (await import('../routes/control')).default);
  app.use('/api/auth', (await import('../routes/auth')).default);
  app.use('/api/game', (await import('../routes/game')).default);
  app.get('/api/launcher/access', async (_req,res) => res.json(await getLauncherAccess()));
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
    assert.equal((await change({closed:false,message:''})).status,200);
    assert.equal((await fetch(base+'/api/auth/me',{headers:player})).status,200);
    const audit = await (await fetch(base+'/api/control/audit',{headers:admin})).json();
    assert.deepEqual(audit.items.map((row:any)=>row.action), ['launcher:open','launcher:close']);
  } finally { await new Promise<void>(resolve=>server.close(()=>resolve()));await closeDatabase();await fs.rm(directory,{recursive:true,force:true}); }
});
