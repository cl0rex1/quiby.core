import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import express from 'express';
import { PNG } from 'pngjs';
import { renderSkinHead } from '../services/skinHead';

test('face thumbnail preserves pixels and transparent hat overlay',()=>{
  const source=new PNG({width:64,height:64});source.data.fill(0);
  source.data.set([20,40,60,255],(8*64+8)*4);source.data.set([100,120,140,128],(8*64+40)*4);
  const head=PNG.sync.read(renderSkinHead(PNG.sync.write(source)));
  assert.equal(head.width,64);assert.deepEqual([...head.data.subarray(0,4)],[60,80,100,255]);
  assert.equal(PNG.sync.read(renderSkinHead()).width,64);
});
test('chat scopes credentials and privacy, maps mentions, deduplicates and acknowledges both directions',async()=>{
  const dir=await fs.mkdtemp(path.join(os.tmpdir(),'quiby-chat-'));
  process.env.DB_PATH=path.join(dir,'test.sqlite');process.env.STORAGE_PATH=dir;
  const {config}=await import('../config');config.gameBridgeApiKey='game-bridge-'.repeat(4);config.modReviewBotApiKey='bot-bridge-'.repeat(4);
  const {initDatabase,dbRun,closeDatabase}=await import('../models/db');await initDatabase();
  const {gameBridgeRoutes,botChatRoutes}=await import('../routes/gameBridge');
  const uuid='12345678-1234-4321-8765-123456789012',other='22345678-1234-4321-8765-123456789012';
  await dbRun('INSERT INTO users(discord_id,discord_username,mc_username,uuid) VALUES(?,?,?,?),(?,?,?,?)',
    ['123456789012345678','one','PlayerOne',uuid,'223456789012345678','two','PlayerTwo',other]);
  const app=express();app.use(express.json());app.use('/game',gameBridgeRoutes);app.use('/bot',botChatRoutes);
  app.use((error:any,_req:any,res:any,_next:any)=>res.status(500).json({error:error.message}));
  const server=app.listen(0,'127.0.0.1');await new Promise<void>(r=>server.once('listening',r));
  const base='http://127.0.0.1:'+(server.address() as {port:number}).port;
  const game={'x-game-bridge-key':config.gameBridgeApiKey,'Content-Type':'application/json'},bot={'x-bot-key':config.modReviewBotApiKey,'Content-Type':'application/json'};
  const post=(route:string,body:unknown,headers:Record<string,string>)=>fetch(base+route,{method:'POST',headers,body:JSON.stringify(body)});
  const get=async(route:string,headers:Record<string,string>)=>{const r=await fetch(base+route,{headers});assert.equal(r.status,200);return r.json();};
  try{
    assert.equal((await fetch(base+'/game/messages')).status,403);
    assert.equal((await fetch(base+'/bot/events',{headers:game})).status,403);
    assert.equal((await fetch(base+'/game/messages',{headers:bot})).status,403);
    const event={eventId:'33333333-1234-4321-8765-123456789012',scope:'local',uuid,username:'PlayerOne',text:'@PlayerTwo hello',mentions:['PlayerTwo']};
    assert.equal((await post('/game/events',{events:[event]},game)).status,200);
    assert.equal((await post('/game/events',{events:[event]},game)).status,200);
    const queue=await get('/bot/events',bot);assert.equal(queue.events.length,1);assert.equal(queue.events[0].scope,'local');assert.equal(queue.events[0].mentions[0].discordId,'223456789012345678');
    assert.equal((await get('/game/messages',game)).messages.length,0,'Minecraft events must not echo back');
    assert.equal((await post('/bot/events/'+queue.events[0].id+'/ack',{},bot)).status,200);assert.equal((await get('/bot/events',bot)).events.length,0);
    const stale={...event,eventId:'43333333-1234-4321-8765-123456789012',uuid:other,username:'PlayerOne'};
    const valid={...event,eventId:'53333333-1234-4321-8765-123456789012',scope:'global'};
    const batch=await post('/game/events',{events:[stale,valid]},game);
    assert.equal(batch.status,200);assert.deepEqual((await batch.json()).rejected,[stale.eventId]);
    const following=await get('/bot/events',bot);assert.equal(following.events.length,1);assert.equal(following.events[0].scope,'global');
    await post('/bot/events/'+following.events[0].id+'/ack',{},bot);
    const discord={eventId:'323456789012345678',discordId:'123456789012345678',username:'Discord Name',text:'hello @PlayerTwo',mentions:['223456789012345678'],images:['https://cdn.discordapp.com/attachments/123/456/photo.png?ex=abc']};
    assert.equal((await post('/bot/messages',discord,bot)).status,200);assert.equal((await post('/bot/messages',discord,bot)).status,200);
    const incoming=await get('/game/messages',game);assert.equal(incoming.messages.length,1);assert.equal(incoming.messages[0].username,'PlayerOne');assert.deepEqual(incoming.messages[0].mentions,[other]);assert.deepEqual(incoming.messages[0].images,discord.images);
    for(const image of ['http://127.0.0.1/private','https://cdn.discordapp.com.evil.example/attachments/x','https://cdn.discordapp.com@127.0.0.1/attachments/x','https://cdn.discordapp.com/private'])assert.equal((await post('/bot/messages',{...discord,images:[image]},bot)).status,400);
    assert.equal((await post('/game/messages/'+incoming.messages[0].id+'/ack',{},game)).status,200);assert.equal((await get('/game/messages',game)).messages.length,0);
    assert.equal((await get('/bot/events',bot)).events.length,0,'Discord messages must not echo through webhooks');
  }finally{await new Promise<void>(r=>server.close(()=>r()));await closeDatabase();await fs.rm(dir,{recursive:true,force:true});}
});
