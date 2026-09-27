import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { installJava21 } from '../managedJava';

test('Java installer rejects a corrupt archive before extracting or running it', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'quiby-java-test-'));
  const originalFetch = globalThis.fetch;
  let requests = 0;
  globalThis.fetch = (async () => {
    requests++;
    return requests % 2 === 1
      ? new Response(JSON.stringify([{ binary: { package: { link: 'https://example.invalid/java.zip', checksum: '0'.repeat(64), size: 3 } } }]))
      : new Response('bad');
  }) as typeof fetch;
  try {
    const first = installJava21(root);
    assert.equal(installJava21(root), first);
    await assert.rejects(first, /повреждённый архив/);
    assert.deepEqual(await fs.readdir(root), []);
    await assert.rejects(installJava21(root), /повреждённый архив/);
    assert.equal(requests, 4, 'failed installs can be retried');
  } finally {
    globalThis.fetch = originalFetch;
    await fs.rm(root, { recursive: true, force: true });
  }
});
