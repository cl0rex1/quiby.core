import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { scanModArchive } from '../modArchiveScan';
import { evaluateCustomMod, hashCustomModBytes } from '../customModVerification';

const fixture = (name: string) => readFileSync(join(__dirname, 'fixtures/mod-scan', name + '.jar.fixture'));
test('archive inspection catches metadata, renamed classes, paths and nested JARs', async () => {
  const clean = await scanModArchive(fixture('clean'));
  assert.equal(clean.complete, true);
  assert.deepEqual(clean.findings, []);
  for (const name of ['metadata', 'path', 'class', 'nested']) {
    const result = await scanModArchive(fixture(name));
    assert.equal(result.complete, true, name);
    assert.ok(result.findings.length, name);
  }
  for (const name of ['duplicate', 'traversal', 'oversize', 'invalid']) {
    assert.equal((await scanModArchive(fixture(name))).complete, false, name);
  }
});

test('automatic admission retains manual denial, explicit approval and hash binding', async () => {
  const original = globalThis.fetch;
  let status = 'unverified', source = 'none', spoof = false;
  globalThis.fetch = async (_url, init) => {
    const hash = JSON.parse(String(init?.body)).mods[0].hash_sha1;
    return new Response(JSON.stringify({ results: [{ hashSha1: spoof ? '0'.repeat(40) : hash,
      status, source, isAllowed: status === 'approved', reason: 'Review' }] }));
  };
  try {
    assert.equal((await evaluateCustomMod('renamed.jar', fixture('clean'), 'http://test')).isAllowed, true);
    assert.equal((await evaluateCustomMod('renamed.jar', fixture('class'), 'http://test')).isAllowed, false);
    status = 'blocked'; source = 'whitelist';
    assert.equal((await evaluateCustomMod('renamed.jar', fixture('clean'), 'http://test')).isAllowed, false);
    status = 'approved';
    const gamma = await evaluateCustomMod('renamed.jar', fixture('gamma'), 'http://test');
    assert.equal(gamma.isAllowed, false);
    assert.equal(gamma.status, 'blocked');
    assert.equal((await evaluateCustomMod('renamed.jar', fixture('class'), 'http://test')).isAllowed, true);
    assert.equal((await evaluateCustomMod('broken.jar', fixture('invalid'), 'http://test')).isAllowed, false);
    spoof = true;
    await assert.rejects(evaluateCustomMod('renamed.jar', fixture('clean'), 'http://test'));
    assert.notEqual(hashCustomModBytes(fixture('clean')), hashCustomModBytes(fixture('class')));
  } finally { globalThis.fetch = original; }
});
