import assert from 'node:assert/strict';
import { test } from 'node:test';
import http from 'node:http';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { downloadFile } from '../downloader';
import { startDiscordOAuthFlow } from '../../auth/discordAuth';

test('downloads verify Mojang hashes, preserve good files on failure and remove partial files', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'quiby-download-'));
  const payload = Buffer.from('verified Minecraft artifact');
  const server = http.createServer((req, res) => {
    if (req.url === '/stall') { res.writeHead(200); res.write('incomplete'); }
    else res.end(payload);
  });
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  const port = (server.address() as { port: number }).port;
  const destination = path.join(root, 'client.jar');
  try {
    await downloadFile(`http://127.0.0.1:${port}/ok`, destination, undefined, crypto.createHash('sha1').update(payload).digest('hex'));
    assert.deepEqual(await fs.readFile(destination), payload);
    await assert.rejects(downloadFile(`http://127.0.0.1:${port}/ok`, destination, undefined, '0'.repeat(64)), /SHA-256/);
    assert.deepEqual(await fs.readFile(destination), payload);
    await assert.rejects(downloadFile(`http://127.0.0.1:${port}/stall`, destination, undefined, undefined, 100));
    assert.deepEqual(await fs.readFile(destination), payload);
    assert.deepEqual(await fs.readdir(root), ['client.jar']);
  } finally {
    server.closeAllConnections();
    await new Promise<void>(resolve => server.close(() => resolve()));
    await fs.rm(root, { recursive: true, force: true });
  }
});

test('an occupied OAuth callback port returns a recoverable error without crashing Electron', async () => {
  const occupied = http.createServer();
  await new Promise<void>(resolve => occupied.listen(0, '127.0.0.1', resolve));
  try {
    const port = (occupied.address() as { port: number }).port;
    const result = await startDiscordOAuthFlow('http://127.0.0.1:1', port);
    assert.equal(result.needsBinding, false);
    assert.match(result.error!, /порт авторизации занят/);
  } finally { await new Promise<void>(resolve => occupied.close(() => resolve())); }
});
