import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { test } from 'node:test';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { hashCustomModBytes, hashCustomModFile, requireApprovedCustomMod } from '../customModVerification';

test('custom mod approval is bound to the bytes, and denied mods fail closed', async () => {
  const approvedHash = hashCustomModBytes(Buffer.from('approved mod'));
  let requestedHash = '';
  let allow = true;
  let spoofHash = false;
  const server = createServer(async (req, res) => {
    const chunks: Buffer[] = [];
    for await (const chunk of req) chunks.push(Buffer.from(chunk));
    requestedHash = JSON.parse(Buffer.concat(chunks).toString()).mods[0].hash_sha1;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ results: [{
      hashSha1: spoofHash ? '0'.repeat(40) : requestedHash,
      status: allow && requestedHash === approvedHash ? 'approved' : 'unverified',
      isAllowed: allow && requestedHash === approvedHash,
    }] }));
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));

  try {
    const serverUrl = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
    const dir = mkdtempSync(join(tmpdir(), 'quiby-mod-verification-'));
    try {
      const modPath = join(dir, 'client-mod.jar');
      writeFileSync(modPath, 'approved mod');
      assert.equal(await hashCustomModFile(modPath), approvedHash);
      writeFileSync(modPath, 'changed mod');
      assert.notEqual(await hashCustomModFile(modPath), approvedHash);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }

    await requireApprovedCustomMod('client-mod.jar', approvedHash, 12, serverUrl);
    assert.equal(requestedHash, approvedHash);

    const changedHash = hashCustomModBytes(Buffer.from('changed mod'));
    await assert.rejects(
      requireApprovedCustomMod('client-mod.jar', changedHash, 11, serverUrl),
      /не разрешён/
    );

    allow = false;
    await assert.rejects(
      requireApprovedCustomMod('client-mod.jar', approvedHash, 12, serverUrl),
      /не разрешён/
    );

    allow = true;
    spoofHash = true;
    await assert.rejects(
      requireApprovedCustomMod('client-mod.jar', approvedHash, 12, serverUrl),
      /хеш в ответе не совпадает/
    );

    await assert.rejects(
      requireApprovedCustomMod('client-mod.jar', approvedHash, 12, 'http://127.0.0.1:1'),
      /недоступен/
    );
  } finally {
    server.close();
  }
});
