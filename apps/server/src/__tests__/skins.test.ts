import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import express from 'express';
import jwt from 'jsonwebtoken';
import { PNG } from 'pngjs';

async function run() {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'quiby-skins-'));
  process.env.NODE_ENV = 'test';
  process.env.STORAGE_PATH = directory;
  process.env.DB_PATH = path.join(directory, 'test.sqlite');
  process.env.JWT_SECRET = 'test-secret-long-enough-for-skin-integration';
  const { initDatabase, dbRun, closeDatabase } = await import('../models/db');
  const { default: skinRoutes } = await import('../routes/skins');
  await initDatabase();
  await dbRun('INSERT INTO users (discord_id, discord_username, mc_username, uuid) VALUES (?, ?, ?, ?)',
    ['discord-1', 'Tester', 'SkinTester', '0123456789abcdef0123456789abcdef']);

  const app = express();
  app.use(express.json());
  app.use('/api/skins', skinRoutes);
  const server = app.listen(0, '127.0.0.1');
  try {
    await new Promise<void>(resolve => server.once('listening', resolve));
    const address = server.address();
    if (!address || typeof address === 'string') throw new Error('No test port');
    const url = `http://127.0.0.1:${address.port}/api/skins`;
    const token = jwt.sign({ discordId: 'discord-1', mcUsername: 'SkinTester', authMethod: 'discord' }, process.env.JWT_SECRET!);
    const skin = new PNG({ width: 64, height: 64 });
    skin.data.fill(255);
    const dataUri = `data:image/png;base64,${PNG.sync.write(skin).toString('base64')}`;

    assert.equal((await fetch(`${url}/me`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ dataUri }) })).status, 401);
    assert.equal((await fetch(`${url}/me`, { method: 'PUT', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ dataUri }) })).status, 200);
    const response = await fetch(`${url}/skintester.png`);
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('content-type'), 'image/png');
    const saved = await readFile(path.join(directory, 'skins', '0123456789abcdef0123456789abcdef.png'));
    assert.equal(PNG.sync.read(saved).width, 64);
    assert.equal((await fetch(`${url}/me`, { method: 'PUT', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ dataUri: 'data:image/png;base64,AAAA' }) })).status, 400);
    assert.equal((await fetch(`${url}/me`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } })).status, 200);
    assert.equal((await fetch(`${url}/SkinTester.png`)).status, 404);
  } finally {
    await new Promise<void>(resolve => server.close(() => resolve()));
    await closeDatabase();
    await rm(directory, { recursive: true, force: true });
  }
}

run().catch(error => { console.error(error); process.exitCode = 1; });
