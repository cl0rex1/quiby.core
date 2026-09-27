import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import express from 'express';
import jwt from 'jsonwebtoken';

// Dedicated database: these checks never mutate the developer's player/mod tables.
test('bot API authenticates, attributes requests and atomically applies idempotent decisions', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'quiby-bot-api-'));
  process.env.DB_PATH = path.join(dir, 'test.sqlite');
  process.env.STORAGE_PATH = dir;
  process.env.MOD_REVIEW_BOT_API_KEY = 'test-only-bot-key-with-at-least-32-characters';
  const { config } = await import('../config');
  const { initDatabase, dbRun, dbGet, closeDatabase } = await import('../models/db');
  const { verifyMod } = await import('../services/modSafetyService');
  const bot = (await import('../routes/bot')).default;
  const mods = (await import('../routes/mods')).default;
  const auth = (await import('../routes/auth')).default;
  await initDatabase();
  await initDatabase(); // Migration is repeatable.
  await dbRun(
    "INSERT INTO users(discord_id, discord_username, mc_username, uuid) VALUES ('123456789012345678', 'Tester', 'Tester', 'test-uuid')",
  );
  await dbRun(
    "INSERT INTO users(discord_id, discord_username, mc_username, uuid) VALUES ('dev_old', 'OldTest', 'OldTest', 'dev-uuid')",
  );
  const token = jwt.sign({ discordId: '123456789012345678', mcUsername: 'Tester', authMethod: 'discord' }, config.jwtSecret);
  const oldDevToken = jwt.sign({ discordId: 'dev_old', mcUsername: 'OldTest', authMethod: 'discord' }, config.jwtSecret);
  const legacyToken = jwt.sign({ discordId: '123456789012345678', mcUsername: 'Tester' }, config.jwtSecret);
  const app = express();
  app.use(express.json());
  app.use('/api/bot', bot);
  app.use('/api/mods', mods);
  app.use('/api/auth', auth);
  const server = app.listen(0, '127.0.0.1');
  await new Promise<void>((resolve) => server.once('listening', resolve));
  const address = server.address() as { port: number };
  const base = 'http://127.0.0.1:' + address.port;
  const request = (route: string, options: RequestInit = {}) => fetch(base + route, options);
  const botHeaders = { 'x-bot-key': config.modReviewBotApiKey, 'Content-Type': 'application/json' };
  const playerHeaders = { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' };
  const payload = {
    mod_name: 'Utility',
    filename: 'utility.jar',
    hash_sha1: 'a'.repeat(40),
    reason: 'Please review this utility',
    project_url: 'https://example.com/utility',
    user_discord_id: 'spoofed',
    mc_username: 'Spoofed',
  };
  try {
    assert.equal((await request('/api/auth/dev-login', { method: 'POST' })).status, 404);
    assert.equal((await request('/api/auth/me', { headers: { Authorization: `Bearer ${oldDevToken}` } })).status, 401);
    assert.equal((await request('/api/auth/me', { headers: { Authorization: `Bearer ${legacyToken}` } })).status, 401);
    assert.equal((await request('/api/auth/bind-mc', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mcUsername: 'NoDiscord' }),
    })).status, 401);
    assert.equal((await request('/api/auth/verify-session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'OldTest', token: oldDevToken, uuid: 'dev-uuid' }),
    })).status, 403);
    assert.equal((await request('/api/bot/mod-whitelist-requests')).status, 403);
    assert.equal((await request('/api/mods/whitelist-requests')).status, 403);
    assert.equal(
      (
        await request('/api/mods/whitelist-request', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
      ).status,
      401,
    );
    const binding = jwt.sign(
      { discordId: '123456789012345678', mcUsername: 'Tester', purpose: 'mc_binding' },
      config.jwtSecret,
    );
    assert.equal(
      (
        await request('/api/mods/whitelist-request', {
          method: 'POST',
          headers: { ...playerHeaders, Authorization: 'Bearer ' + binding },
          body: JSON.stringify(payload),
        })
      ).status,
      401,
    );
    const submit = async (body = payload) => {
      const response = await request('/api/mods/whitelist-request', {
        method: 'POST',
        headers: playerHeaders,
        body: JSON.stringify(body),
      });
      assert.equal(response.status, 200);
      return (await response.json()).request;
    };
    const created = await submit();
    assert.equal((await submit()).id, created.id);
    const queue = await (
      await request('/api/bot/mod-whitelist-requests?limit=1', { headers: botHeaders })
    ).json();
    assert.equal(queue.requests[0].user_discord_id, '123456789012345678');
    assert.equal(queue.requests[0].mc_username, 'Tester');
    assert.equal(queue.requests[0].project_url, payload.project_url);
    assert.equal(queue.next_after_id, created.id);
    assert.equal(
      (await request('/api/bot/mod-whitelist-requests?limit=1000', { headers: botHeaders })).status,
      400,
    );
    await dbRun(
      "INSERT INTO verified_mods(hash_sha1,name,source,is_allowed,status) VALUES (?, 'Utility','none',0,'unverified')",
      [payload.hash_sha1],
    );
    const review = (id: number, decision = 'approved', reviewer = '234567890123456789') =>
      request('/api/bot/mod-whitelist-requests/' + id, {
        method: 'PATCH',
        headers: botHeaders,
        body: JSON.stringify({ decision, reviewer_discord_id: reviewer, reason: 'Reviewed exact version' }),
      });
    const approved = await review(created.id);
    assert.equal(approved.status, 200);
    assert.equal((await verifyMod('Utility', 'utility.jar', payload.hash_sha1)).isAllowed, true);
    assert.equal((await dbGet<any>('SELECT is_allowed FROM verified_mods WHERE hash_sha1=?', [payload.hash_sha1]))?.is_allowed, 1);
    const retry = await (await review(created.id, 'approved', '345678901234567890')).json();
    assert.equal(retry.request.reviewer_discord_id, '234567890123456789');
    assert.equal((await review(created.id, 'rejected')).status, 409);
    assert.equal((await review(999999)).status, 404);
    const rejected = await submit({ ...payload, hash_sha1: 'b'.repeat(40) });
    assert.equal((await review(rejected.id, 'rejected')).status, 200);
    assert.equal((await verifyMod('Utility', 'utility.jar', 'b'.repeat(40))).status, 'blocked');
    assert.equal((await dbGet<any>('SELECT status FROM verified_mods WHERE hash_sha1=?', ['b'.repeat(40)]))?.status, 'blocked');
    const row = await dbGet<any>('SELECT * FROM mod_whitelist_requests WHERE id = ?', [rejected.id]);
    assert.ok(row.reviewed_at);
    assert.equal(row.decision_reason, 'Reviewed exact version');
    const earlier = await submit({ ...payload, hash_sha1: 'c'.repeat(40) });
    await dbRun("UPDATE mod_whitelist_requests SET status='rejected' WHERE id=?", [earlier.id]);
    const later = await submit({ ...payload, hash_sha1: 'c'.repeat(40) });
    await dbRun("UPDATE mod_whitelist_requests SET status='pending' WHERE id=?", [earlier.id]);
    assert.equal((await review(later.id, 'approved')).status, 200);
    assert.equal((await review(earlier.id, 'rejected')).status, 200);
    await dbRun("UPDATE verified_mods SET is_allowed=1,status='approved',source='modrinth' WHERE hash_sha1=?", ['c'.repeat(40)]);
    assert.equal((await verifyMod('Utility', 'utility.jar', 'c'.repeat(40))).status, 'blocked');
    await dbRun('DELETE FROM verified_mods WHERE hash_sha1=?', ['c'.repeat(40)]);
    assert.equal((await verifyMod('Utility', 'utility.jar', 'c'.repeat(40))).status, 'blocked');
    const key = config.modReviewBotApiKey;
    config.modReviewBotApiKey = '';
    assert.equal((await request('/api/bot/mod-whitelist-requests', { headers: botHeaders })).status, 503);
    config.modReviewBotApiKey = key;
  } finally {
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
    await closeDatabase();
    await fs.rm(dir, { recursive: true, force: true });
  }
});
