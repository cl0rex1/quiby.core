import assert from 'node:assert/strict';
import { test } from 'node:test';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { createHash } from 'node:crypto';
import { checkContentLinks, verifyLaunchContent } from '../contentIntegrity';

test('checks actual resource packs and mods, not names or UI inventory', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'quiby-content-'));
  const digest = (data: string, alg = 'sha256') => createHash(alg).update(data).digest('hex');
  try {
    await fs.mkdir(path.join(root, 'mods'));
    await fs.mkdir(path.join(root, 'resourcepacks'));
    const pack = path.join(root, 'resourcepacks', 'official.zip');
    await fs.writeFile(pack, 'trusted');
    const files = [{ path: 'resourcepacks/official.zip', sha256: digest('trusted') }];
    await verifyLaunchContent(root, files, new Map());
    await fs.writeFile(pack, 'modified');
    await assert.rejects(verifyLaunchContent(root, files, new Map()), /изменён/);
    await fs.writeFile(pack, 'trusted');
    const extra = path.join(root, 'resourcepacks', 'innocent-name.ZIP');
    await fs.writeFile(extra, 'xray');
    await assert.rejects(verifyLaunchContent(root, files, new Map()), /не входит/);
    const packApprovals = new Map([['innocent-name.ZIP', digest('xray')]]);
    await verifyLaunchContent(root, files, new Map(), packApprovals);
    await fs.writeFile(extra, 'changed after review');
    await assert.rejects(verifyLaunchContent(root, files, new Map(), packApprovals), /после одобрения/);
    await fs.unlink(extra);
    const folder = path.join(root, 'resourcepacks', 'unpacked');
    await fs.mkdir(folder);
    await assert.rejects(verifyLaunchContent(root, files, new Map()), /распакованная/);
    await fs.rmdir(folder);
    const mod = path.join(root, 'mods', 'custom.JAR');
    await fs.writeFile(mod, 'reviewed');
    await assert.rejects(verifyLaunchContent(root, files, new Map()), /не одобрен/);
    const approvals = new Map([['custom.JAR', digest('reviewed', 'sha1')]]);
    await verifyLaunchContent(root, files, approvals);
    await fs.writeFile(mod, 'changed');
    await assert.rejects(verifyLaunchContent(root, files, approvals), /после одобрения/);
    await fs.unlink(mod);
    await fs.unlink(pack);
    await assert.rejects(verifyLaunchContent(root, files, new Map()), /Отсутствует/);
    const link = path.join(root, 'resourcepacks', 'linked');
    await fs.symlink(path.join(root, 'mods'), link, 'junction');
    await assert.rejects(checkContentLinks(root), /ссылка/);
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});
