import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import express from 'express';
import jwt from 'jsonwebtoken';

test('news CRUD, explicit broadcast revisions and private review status survive database migration', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'quiby-news-test-'));
  process.env.DB_PATH = path.join(dir, 'test.sqlite'); process.env.STORAGE_PATH = dir;
  const { config } = await import('../config'); config.adminApiKey = 'news-test-key';
  const { initDatabase, dbRun, closeDatabase } = await import('../models/db');
  await initDatabase(); await initDatabase();
  const app = express(); app.use(express.json());
  app.use('/api/control', (await import('../routes/control')).default);
  app.use('/api/news', (await import('../routes/news')).default);
  app.use('/api/mods', (await import('../routes/mods')).default);
  app.use('/api/admin', (await import('../routes/admin')).default);
  const server = app.listen(0, '127.0.0.1'); await new Promise<void>(r => server.once('listening', r));
  const base = 'http://127.0.0.1:' + (server.address() as { port: number }).port;
  const request = (url: string, options: RequestInit = {}) => fetch(base + url, options);
  const headers = { 'Content-Type': 'application/json', 'X-Quiby-Control': '1' };
  const news = { title: 'Новая новость', content: 'Содержание новости', author: 'Quiby', tag: 'announcement', broadcast: true };
  try {
    assert.equal((await request('/api/control/news', { method: 'POST', headers, body: JSON.stringify(news) })).status, 401);
    const login = await request('/api/control/login', { method: 'POST', headers, body: JSON.stringify({ key: config.adminApiKey }) });
    const auth = { ...headers, Cookie: login.headers.get('set-cookie')!.split(';')[0] };
    assert.equal((await request('/api/control/news', { method: 'POST', headers: auth, body: JSON.stringify({ ...news, bannerUrl: 'javascript:alert(1)' }) })).status, 400);
    const created = await request('/api/control/news', { method: 'POST', headers: auth, body: JSON.stringify(news) });
    assert.equal(created.status, 201);
    const { id, broadcastRevision } = await created.json(); assert.ok(broadcastRevision);
    const listing = await request('/api/news'); assert.equal(listing.headers.get('cache-control'), 'no-store');
    const article = (await listing.json()).find((item: any) => item.id === id); assert.equal(article.id, id); assert.equal(article.broadcastRevision, broadcastRevision);
    assert.equal(Number.isNaN(Date.parse(article.date)), false);
    const edit = await request('/api/control/news/' + id, { method: 'PUT', headers: auth, body: JSON.stringify({ ...news, title: 'Исправленное название', broadcast: false }) });
    assert.equal((await edit.json()).broadcastRevision, broadcastRevision);
    const repeat = await request('/api/control/news/' + id, { method: 'PUT', headers: auth, body: JSON.stringify(news) });
    assert.notEqual((await repeat.json()).broadcastRevision, broadcastRevision);
    const silent = await request('/api/admin/news', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Admin-Key': config.adminApiKey }, body: JSON.stringify({ ...news, broadcast: false }) });
    assert.equal(silent.status, 201); assert.equal((await silent.json()).broadcastRevision, null);
    const audit = await (await request('/api/control/audit', { headers: auth })).json();
    assert.equal(audit.items.filter((item: any) => item.action === 'news:broadcast').length, 2);
    assert.equal((await request('/api/control/news/missing', { method: 'PUT', headers: auth, body: JSON.stringify(news) })).status, 404);
    assert.equal((await request('/api/control/news/' + id, { method: 'DELETE', headers: auth })).status, 200);
    assert.equal((await request('/api/control/news/' + id, { method: 'DELETE', headers: auth })).status, 404);

    const token = jwt.sign({ authMethod: 'discord', discordId: '123456789012345678', mcUsername: 'Tester' }, config.jwtSecret);
    await dbRun("INSERT INTO users(discord_id,discord_username,mc_username,uuid) VALUES('123456789012345678','Tester','Tester','uuid')");
    const ownHeaders = { Authorization: 'Bearer ' + token };
    const insert = (user: string, hash: string, status: string, sequence: number, auto = 0) => dbRun(`INSERT INTO mod_whitelist_requests
      (user_discord_id,mc_username,mod_name,filename,hash_sha1,status,review_sequence,auto_detected,decision_reason)
      VALUES (?,'Tester','Test','test.jar',?,?,?,?,?)`, [user, hash, status, sequence, auto, status === 'approved' ? 'Проверено' : null]);
    await insert('123456789012345678', 'a'.repeat(40), 'pending', 0);
    await insert('123456789012345678', 'a'.repeat(40), 'pending', 0);
    await insert('another-user', 'b'.repeat(40), 'pending', 0);
    await insert('123456789012345678', 'c'.repeat(40), 'pending', 0, 1);
    await insert('admin', 'a'.repeat(40), 'approved', 1);
    assert.equal((await request('/api/mods/reviews/mine')).status, 401);
    const reviews = await (await request('/api/mods/reviews/mine', { headers: ownHeaders })).json();
    assert.equal(reviews.length, 1); assert.equal(reviews[0].stage, 'approved'); assert.equal(reviews[0].message, 'Проверено');
    await insert('admin', 'a'.repeat(40), 'rejected', 2);
    const revoked = await (await request('/api/mods/reviews/mine', { headers: ownHeaders })).json();
    assert.equal(revoked[0].stage, 'rejected');
  } finally {
    await new Promise<void>(resolve => server.close(() => resolve())); await closeDatabase(); await fs.rm(dir, { recursive: true, force: true });
  }
});
