import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { createHash } from 'node:crypto';
import { guardModDirectory } from '../modDirectoryGuard';

test('running-game guard catches a renamed JAR added after admission and closes once', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'quiby-mod-guard-'));
  await fs.mkdir(path.join(root, 'mods'));
  const contents = 'official';
  await fs.writeFile(path.join(root, 'mods', 'official.jar'), contents);
  const files = [{ path: 'mods/official.jar', sha256: createHash('sha256').update(contents).digest('hex') }];
  let violations = 0;
  let notify!: (error: Error) => void;
  const detected = new Promise<Error>(resolve => { notify = resolve; });
  const guard = guardModDirectory(root, files, new Map(), error => { violations++; notify(error); }, 50);
  try {
    await guard.check();
    await fs.writeFile(path.join(root, 'mods', 'innocent-name.jar'), 'not approved');
    const error = await Promise.race([detected, new Promise<never>((_, reject) => {
      const timer = setTimeout(() => reject(new Error('guard missed the added JAR')), 3000); timer.unref();
    })]);
    assert.match(error.message, /innocent-name.jar.*не одобрен/);
    await guard.check();
    assert.equal(violations, 1);
  } finally { guard.close(); await fs.rm(root, { recursive: true, force: true }); }
});

test('guard keeps approval snapshot and catches replacement of an approved custom JAR', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'quiby-mod-guard-'));
  await fs.mkdir(path.join(root, 'mods'));
  await fs.writeFile(path.join(root, 'mods', 'custom.jar'), 'approved');
  const approvals = new Map([['custom.jar', createHash('sha1').update('approved').digest('hex')]]);
  const guard = guardModDirectory(root, [], approvals, () => {}, 60_000);
  try {
    approvals.set('custom.jar', createHash('sha1').update('changed').digest('hex'));
    await guard.check();
    await fs.writeFile(path.join(root, 'mods', 'custom.jar'), 'changed');
    await assert.rejects(guard.check(), /изменён после одобрения/);
  } finally { guard.close(); await fs.rm(root, { recursive: true, force: true }); }
});
