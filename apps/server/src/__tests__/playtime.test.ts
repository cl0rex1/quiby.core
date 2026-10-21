import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import express from 'express';
import jwt from 'jsonwebtoken';
import { MINIMUM_LAUNCHER_VERSION } from '@quiby/shared';

test('account playtime survives reinstall and retries, merges devices and legacy time once, and stays isolated', async()=>{
  const root=await fs.mkdtemp(path.join(os.tmpdir(),'quiby-playtime-'));
  process.env.DB_PATH=path.join(root,'test.sqlite');process.env.STORAGE_PATH=root;
  const {config}=await import('../config');const {initDatabase,dbRun,closeDatabase}=await import('../models/db');await initDatabase();
  const app=express();app.use(express.json());app.use('/api/game',(await import('../routes/game')).default);
  const server=app.listen(0,'127.0.0.1');await new Promise<void>(r=>server.once('listening',r));
  const url='http://127.0.0.1:'+(server.address() as {port:number}).port+'/api/game/playtime';
  const idA='12345678-1234-4234-8234-123456789001',idB='12345678-1234-4234-8234-123456789002';
  const users=['111111111111111111','222222222222222222'];
  const token=(id:string)=>jwt.sign({discordId:id,mcUsername:'Tester',authMethod:'discord'},config.jwtSecret);
  const headers=(id=users[0])=>({'Content-Type':'application/json',Authorization:'Bearer '+token(id),'x-quiby-launcher-version':MINIMUM_LAUNCHER_VERSION});
  const send=(deviceId:string,totalSeconds:number,legacySeconds=0,id=users[0])=>fetch(url,{method:'PUT',headers:headers(id),body:JSON.stringify({deviceId,totalSeconds,legacySeconds})});
  const total=async(device:string,time:number,legacy=0,id=users[0])=>{const r=await send(device,time,legacy,id);assert.equal(r.status,200);assert.equal(r.headers.get('cache-control'),'no-store');return(await r.json()).totalSeconds;};
  try{
    for(const [i,id] of users.entries())await dbRun('INSERT INTO users(discord_id,discord_username,mc_username,uuid) VALUES(?,?,?,?)',[id,'Tester','Tester'+i,'uuid'+i]);
    assert.equal((await fetch(url,{method:'PUT',headers:{'Content-Type':'application/json'},body:'{}'})).status,426);
    assert.equal((await fetch(url,{method:'PUT',headers:{'Content-Type':'application/json','x-quiby-launcher-version':MINIMUM_LAUNCHER_VERSION},body:'{}'})).status,401);
    assert.equal((await send(idA,-1)).status,400);
    assert.equal(await total(idA,0,100),100);
    assert.equal(await total(idA,60,100),160);
    assert.equal(await total(idA,60,100),160);
    assert.equal(await total(idA,30,100),160);
    assert.equal(await total(idB,0),160); // A fresh installation restores the account total.
    assert.equal(await total(idB,30),190);
    assert.equal(await total(idA,90,100),220);
    assert.equal(await total(idA,60,0,users[1]),60);
    assert.equal(await total(idA,90,200),320);
    await initDatabase();assert.equal(await total(idB,30),320);
    await (await import('../services/launcherAccess')).setLauncherAccess(true,'Технические работы');
    assert.equal(await total(idA,100,200),330); // Already running games still save time.
  }finally{await new Promise<void>(r=>server.close(()=>r()));await closeDatabase();await fs.rm(root,{recursive:true,force:true});}
});
