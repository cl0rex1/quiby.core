import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import crypto from 'node:crypto';
import type { ModpackManifest } from '@quiby/shared';
import { selectModpackProfile } from '../../../shared/modpackProfiles';
import { syncModpackFiles } from '../downloader';

const hash = (text: string) => crypto.createHash('sha256').update(text).digest('hex');

test('profile switching removes Visual mods, preserves settings and enforces Explosion setup', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'quiby-profiles-'));
  const payload = 'firstLaunchComplete = true';
  let requests = 0;
  const server = http.createServer((req, res) => {
    requests++;
    if (req.url === '/missing') { res.writeHead(404); res.end(); }
    else res.end(payload);
  });
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  const url = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
  const manifest: ModpackManifest = {
    id: 'test', name: 'test', version: '1', gameVersion: '1.21.1', loader: { type: 'neoforge', version: '21.1.250' },
    javaVersion: 21, recommendedRamMb: 8192, minRamMb: 4096, totalSize: 0, changelog: '', serverAddress: '', updatedAt: '',
    files: [
      { path: 'mods/base.jar', sha256: hash(payload), size: payload.length, action: 'sync' },
      { path: 'mods/visual.jar', sha256: hash(payload), size: payload.length, action: 'sync', profiles: ['full'] },
      { path: 'options.txt', sha256: hash(payload), size: payload.length, action: 'keep_local' },
      { path: 'config/explosion.toml', sha256: hash(payload), size: payload.length, action: 'sync' },
    ],
  };
  try {
    await syncModpackFiles(selectModpackProfile(manifest, 'full'), dir, url, null);
    await fs.writeFile(path.join(dir, 'options.txt'), 'my settings');
    await fs.writeFile(path.join(dir, 'config/explosion.toml'), 'firstLaunchComplete = false');
    const draft = selectModpackProfile(manifest, 'clean');
    assert.equal(draft.totalSize, payload.length * 3);
    await syncModpackFiles(draft, dir, url, null);
    await assert.rejects(fs.stat(path.join(dir, 'mods/visual.jar')), { code: 'ENOENT' });
    assert.equal(await fs.readFile(path.join(dir, 'options.txt'), 'utf8'), 'my settings');
    assert.equal(await fs.readFile(path.join(dir, 'config/explosion.toml'), 'utf8'), payload);
    const previousRequests = requests;
    await syncModpackFiles(draft, dir, url, null);
    assert.equal(requests, previousRequests, 'unchanged pack needs no downloads');
    const bad = { ...draft, files: [{ ...draft.files[0], sha256: hash('expected different bytes') }] };
    await assert.rejects(syncModpackFiles(bad, dir, url, null), /SHA-256/);
    assert.equal(await fs.readFile(path.join(dir, 'mods/base.jar'), 'utf8'), payload, 'bad download never replaces the old file');
    await assert.rejects(fs.stat(path.join(dir, 'mods/base.jar.part')), { code: 'ENOENT' });
    await assert.rejects(syncModpackFiles({ ...bad, files: [{ ...bad.files[0], downloadUrl: '/missing' }] }, dir, url, null), /404/);
    assert.equal(selectModpackProfile(manifest).files.length, 3);
    assert.equal(manifest.files.length, 4, 'selection does not mutate the catalog');
  } finally {
    await new Promise<void>(resolve => server.close(() => resolve()));
    await fs.rm(dir, { recursive: true, force: true });
  }
});
