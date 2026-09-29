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
    source = 'none'; status = 'unverified';
    assert.equal((await evaluateCustomMod('renamed.jar', fixture('gamma'), 'http://test')).isAllowed, false);
    source = 'whitelist'; status = 'approved';
    const gamma = await evaluateCustomMod('renamed.jar', fixture('gamma'), 'http://test');
    assert.equal(gamma.isAllowed, true);
    assert.equal(gamma.status, 'approved');
    source = 'modrinth';
    assert.equal((await evaluateCustomMod('renamed.jar', fixture('gamma'), 'http://test')).isAllowed, false);
    source = 'whitelist';
    assert.equal((await evaluateCustomMod('renamed.jar', fixture('class'), 'http://test')).isAllowed, true);
    assert.equal((await evaluateCustomMod('broken.jar', fixture('invalid'), 'http://test')).isAllowed, false);
    spoof = true;
    await assert.rejects(evaluateCustomMod('renamed.jar', fixture('clean'), 'http://test'));
    assert.notEqual(hashCustomModBytes(fixture('clean')), hashCustomModBytes(fixture('class')));
  } finally { globalThis.fetch = original; }
});


test('detects lighting overrides in escaped metadata, separated paths and renamed gamma mixins', async () => {
  for (const name of ['lighting-unicode','lighting-mixin','lighting-path','lighting-id']) {
    const scan = await scanModArchive(fixture(name));
    assert.equal(scan.complete, true, name);
    assert.equal(scan.blocked, true, name);
  }
});


test('large JAR requires exact manual approval and reports rejected files without hiding the result', async () => {
  const original=globalThis.fetch;
  const bytes=Buffer.alloc(100*1024*1024+1);
  let manual=false, reports=0, failedReport=false;
  globalThis.fetch=async(url,init)=>{
    if(String(url).endsWith('/detected')) {
      reports++;const body=JSON.parse(String(init?.body));assert.equal(body.size,bytes.length);
      assert.equal((init?.headers as Record<string,string>).Authorization,'Bearer test-token');
      return new Response('{}',{status:failedReport?500:200});
    }
    const hash=JSON.parse(String(init?.body)).mods[0].hash_sha1;
    return new Response(JSON.stringify({results:[{hashSha1:hash,status:'approved',isAllowed:true,source:manual?'whitelist':'modrinth',reason:'Checked'}]}));
  };
  try {
    assert.equal((await evaluateCustomMod('large.jar',bytes,'http://test','test-token')).isAllowed,false);
    assert.equal(reports,1);
    manual=true;assert.equal((await evaluateCustomMod('large.jar',bytes,'http://test','test-token')).isAllowed,true);assert.equal(reports,1);
    manual=false;failedReport=true;const result=await evaluateCustomMod('large.jar',bytes,'http://test','test-token');
    assert.equal(result.isAllowed,false);assert.match(result.reason,/пока не отправлена/);
  } finally {globalThis.fetch=original;}
});
