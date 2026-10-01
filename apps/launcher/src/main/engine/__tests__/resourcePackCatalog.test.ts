import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { resourcePackInventory, resourcePackCatalog } from '../resourcePackCatalog';

test('local inventory needs no network; catalog refreshes decisions and replaced-file hashes without hiding other packs', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'quiby-pack-catalog-'));
  const originalFetch = globalThis.fetch;
  const hash = (value: string, algorithm = 'sha1') => createHash(algorithm).update(value).digest('hex');
  try {
    const dir = path.join(root, 'resourcepacks'); await fs.mkdir(dir);
    await Promise.all(['official', 'custom', 'broken'].map(name => fs.writeFile(path.join(dir, `${name}.zip`), name)));
    await fs.writeFile(path.join(dir, 'ignored.txt'), 'text');
    globalThis.fetch = async () => { throw new Error('network is unavailable'); };
    const local = await resourcePackInventory(root);
    assert.equal(local.length, 3); assert.ok(local.every(item => item.status === 'checking' && !item.isAllowed));
    const files = [{ path: 'resourcepacks\\official.zip', sha256: hash('official', 'sha256') }];
    let allowed = true; const requests: string[] = [];
    globalThis.fetch = async (_url, init) => {
      const digest = JSON.parse(init?.body as string).hash_sha1; requests.push(digest);
      if (digest === hash('broken')) return new Response('', { status: 503 });
      return new Response(JSON.stringify({ status: allowed ? 'approved' : 'rejected', isAllowed: allowed, reason: 'decision' }));
    };
    const first = await resourcePackCatalog(root, files, 'token', 'https://example.test');
    assert.equal(first.find(item => item.filename === 'official.zip')?.official, true);
    assert.equal(first.find(item => item.filename === 'broken.zip')?.status, 'error');
    assert.equal(first.find(item => item.filename === 'custom.zip')?.isAllowed, true);
    assert.ok(!requests.includes(hash('official')));
    allowed = false;
    const next = await resourcePackCatalog(root, files, 'token', 'https://example.test');
    assert.equal(next.find(item => item.filename === 'custom.zip')?.isAllowed, false);
    assert.equal(requests.filter(value => value === hash('custom')).length, 2);
    await fs.writeFile(path.join(dir, 'custom.zip'), 'replacement');
    const changed = await resourcePackCatalog(root, files, 'token', 'https://example.test');
    assert.equal(changed.find(item => item.filename === 'custom.zip')?.hashSha1, hash('replacement'));
  } finally { globalThis.fetch = originalFetch; await fs.rm(root, { recursive: true, force: true }); }
});
