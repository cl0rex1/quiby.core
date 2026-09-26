import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

test('Modrinth approval requires the exact NeoForge 1.21.1 mod file', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'quiby-modrinth-'));
  process.env.DB_PATH = path.join(dir, 'test.sqlite');
  process.env.STORAGE_PATH = dir;
  const { initDatabase, closeDatabase } = await import('../models/db');
  const { verifyMod } = await import('../services/modSafetyService');
  await initDatabase();
  const originalFetch = globalThis.fetch;
  const version = (hash: string, loaders = ['neoforge']) => ({
    project_id: 'good-project', game_versions: ['1.21.1'], loaders,
    files: [{ hashes: { sha1: hash } }],
  });
  let calls = 0;
  let projectType = 'mod';
  globalThis.fetch = async (url) => {
    calls++;
    const requested = String(url).split('/version_file/')[1]?.split('?')[0];
    const body = requested
      ? version(requested === 'd'.repeat(40) ? '0'.repeat(40) : requested, requested === 'b'.repeat(40) ? ['fabric'] : ['neoforge'])
      : { project_type: projectType, title: 'Utility', categories: ['optimization'], slug: 'utility', description: 'A utility' };
    return new Response(JSON.stringify(body), { status: 200 });
  };
  try {
    const approved = await verifyMod('Utility', 'utility.jar', 'a'.repeat(40));
    assert.equal(approved.status, 'approved');
    assert.equal(approved.source, 'modrinth');
    assert.equal(calls, 2);
    assert.equal((await verifyMod('Utility', 'utility.jar', 'a'.repeat(40))).status, 'approved');
    assert.equal(calls, 2, 'validated result is cached');
    const incompatible = await verifyMod('Utility', 'utility.jar', 'b'.repeat(40));
    assert.equal(incompatible.status, 'unverified');
    assert.match(incompatible.reason, /NeoForge/);
    assert.equal((await verifyMod('Utility', 'utility.jar', 'd'.repeat(40))).status, 'unverified', 'file hash must match the response');
    projectType = 'modpack';
    assert.equal((await verifyMod('Utility', 'utility.jar', 'e'.repeat(40))).status, 'unverified', 'project must be a mod');
    globalThis.fetch = async () => new Response('unavailable', { status: 503 });
    assert.match((await verifyMod('Utility', 'utility.jar', 'c'.repeat(40))).reason, /временно недоступен/);
  } finally {
    globalThis.fetch = originalFetch;
    await closeDatabase();
    await fs.rm(dir, { recursive: true, force: true });
  }
});
