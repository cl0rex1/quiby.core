import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { prepareResourcePackAdmission } from '../resourcePackAdmission';

test('game admission combines manifest hashes with explicit pack decisions and fails closed', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'quiby-pack-admission-'));
  const originalFetch = globalThis.fetch;
  try {
    const dir = path.join(root, 'resourcepacks');
    await fs.mkdir(dir);
    await fs.writeFile(path.join(dir, 'official.zip'), 'official');
    const hash = (text: string, algorithm = 'sha256') => createHash(algorithm).update(text).digest('hex');
    const files = [{ path: 'resourcepacks/official.zip', sha256: hash('official') }];
    globalThis.fetch = async () => { throw new Error('official packs must not need review API'); };
    const official = await prepareResourcePackAdmission(root, files, 'token', 'https://api.example.test');
    assert.deepEqual(official.hashes, [hash('official')]);
    await fs.writeFile(path.join(dir, 'custom.zip'), 'custom');
    globalThis.fetch = async (_url, init) => {
      assert.equal(JSON.parse(init?.body as string).hash_sha1, hash('custom', 'sha1'));
      return new Response(JSON.stringify({ isAllowed: true, status: 'approved' }), { status: 200 });
    };
    const custom = await prepareResourcePackAdmission(root, files, 'token', 'https://api.example.test');
    assert.equal(custom.approved.get('custom.zip'), hash('custom'));
    assert.ok(custom.hashes.includes(hash('custom')));
    globalThis.fetch = async () => new Response(JSON.stringify({ isAllowed: false, reason: 'Отклонён' }));
    await assert.rejects(prepareResourcePackAdmission(root, files, 'token', 'https://api.example.test'), /Отклонён/);
    globalThis.fetch = async () => new Response('', { status: 503 });
    await assert.rejects(prepareResourcePackAdmission(root, files, 'token', 'https://api.example.test'), /503/);
  } finally {
    globalThis.fetch = originalFetch;
    await fs.rm(root, { recursive: true, force: true });
  }
});
