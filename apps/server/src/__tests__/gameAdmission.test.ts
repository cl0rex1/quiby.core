import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { generateKeyPairSync, sign, verify } from 'node:crypto';
import express from 'express';
import jwt from 'jsonwebtoken';
import { MINIMUM_LAUNCHER_VERSION } from '@quiby/shared';

test('game tickets require allowed Discord accounts, bind a signing key and cannot authorize API operations', async () => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'quiby-game-admission-'));
  process.env.DB_PATH = path.join(directory, 'test.sqlite');
  process.env.STORAGE_PATH = directory;
  const { config } = await import('../config');
  const { initDatabase, dbRun, closeDatabase } = await import('../models/db');
  await initDatabase();
  const { requireAuth } = await import('../middleware/auth');
  const app = express();
  app.use(express.json());
  app.use('/api/game', (await import('../routes/game')).default);
  app.get('/protected', requireAuth, (_req, res) => res.sendStatus(204));
  const server = app.listen(0, '127.0.0.1');
  await new Promise<void>(resolve => server.once('listening', resolve));
  const url = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
  const uuid = 'f4606112-bd19-394a-bd0b-0b7f6f6a5001';
  const discordId = '746041139714457671';
  const session = jwt.sign({ discordId, mcUsername: 'Tester', authMethod: 'discord' }, config.jwtSecret);
  const headers = { 'Content-Type': 'application/json', 'x-quiby-launcher-version': MINIMUM_LAUNCHER_VERSION, Authorization: `Bearer ${session}` };
  const keys = generateKeyPairSync('ed25519');
  const publicKey = keys.publicKey.export({ type: 'spki', format: 'der' }).toString('base64');
  const issue = (overrides: Record<string, string> = {}) => fetch(url + '/api/game/join-ticket', { method: 'POST', headers: { ...headers, ...overrides }, body: JSON.stringify({ publicKey }) });
  const check = (ticket: string, username = 'Tester', playerUuid = uuid) => fetch(url + '/api/game/verify-join-ticket', { method: 'POST', headers, body: JSON.stringify({ ticket, username, uuid: playerUuid }) });
  try {
    await dbRun('INSERT INTO users(discord_id,discord_username,mc_username,uuid,is_whitelisted) VALUES(?,?,?,?,1)', [discordId, 'Tester', 'Tester', uuid]);
    assert.equal((await issue({ Authorization: '' })).status, 401);
    assert.equal((await issue({ 'x-quiby-launcher-version': '' })).status, 426);
    const response = await issue();
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('cache-control'), 'no-store');
    const { ticket } = await response.json();
    assert.equal((await check(session)).status, 401);
    assert.equal((await check(ticket, 'Imposter')).status, 403);
    assert.equal((await check(ticket, 'Tester', 'f4606112-bd19-394a-bd0b-0b7f6f6a5002')).status, 403);
    const result = await (await check(ticket)).json();
    assert.equal(result.valid, true);
    assert.equal(result.publicKey, publicKey);
    const challenge = Buffer.from('quiby-s6:unique-server-nonce');
    const proof = sign(null, challenge, keys.privateKey);
    assert.equal(verify(null, challenge, keys.publicKey, proof), true);
    assert.equal(verify(null, Buffer.from('quiby-s6:other-nonce'), keys.publicKey, proof), false);
    assert.equal((await fetch(url + '/protected', { headers: { Authorization: `Bearer ${ticket}` } })).status, 401);
    const expired = jwt.sign({ purpose: 'minecraft_join', mcUsername: 'Tester', uuid, publicKey }, config.jwtSecret,
      { audience: 'quiby-s6-game', issuer: 'quiby-core', subject: discordId, expiresIn: -1 });
    assert.equal((await check(expired)).status, 401);
    await dbRun('UPDATE users SET is_whitelisted=0 WHERE discord_id=?', [discordId]);
    assert.equal((await issue()).status, 403);
    assert.equal((await check(ticket)).status, 403);
  } finally {
    await new Promise<void>(resolve => server.close(() => resolve()));
    await closeDatabase();
    await fs.rm(directory, { recursive: true, force: true });
  }
});
