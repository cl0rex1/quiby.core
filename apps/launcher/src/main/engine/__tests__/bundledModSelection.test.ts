import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import type { ModpackManifest } from '@quiby/shared';
import { selectModpackProfile } from '../../../shared/modpackProfiles';
import { applyBundledModSelection } from '../bundledModSelection';
import { verifyLaunchContent } from '../contentIntegrity';

test('client selections persist by mod ID and never permit disabled or mandatory JAR bypasses', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'quiby-bundled-selection-'));
  const bytes = 'verified fixture';
  const sha256 = crypto.createHash('sha256').update(bytes).digest('hex');
  const catalog = { files: [
    { path: 'mods/mouse-v1.jar', modId: 'mousetweaks', side: 'client', userToggleable: true, sha256, size: bytes.length },
    { path: 'mods/quiby.jar', modId: 'quiby', side: 'client', userToggleable: true, sha256, size: bytes.length },
  ] } as ModpackManifest;
  try {
    await fs.mkdir(path.join(dir, 'mods'));
    for (const file of catalog.files) await fs.writeFile(path.join(dir, file.path), bytes);
    const disabled = selectModpackProfile(catalog, 'optimal', ['mousetweaks', 'quiby']);
    assert.deepEqual(disabled.files.map(file => file.modId), ['quiby']);
    applyBundledModSelection(dir, catalog, disabled);
    assert.equal(await fs.readFile(path.join(dir, 'mods/mouse-v1.jar.disabled'), 'utf8'), bytes);
    await verifyLaunchContent(dir, disabled.files, new Map());
    await fs.writeFile(path.join(dir, 'mods/mouse-v1.jar'), bytes);
    await assert.rejects(verifyLaunchContent(dir, disabled.files, new Map()), /не одобрен/);
    await fs.unlink(path.join(dir, 'mods/mouse-v1.jar'));
    applyBundledModSelection(dir, catalog, catalog);
    await verifyLaunchContent(dir, catalog.files, new Map());
    const updated = { ...catalog, files: [{ ...catalog.files[0], path: 'mods/mouse-v2.jar' }, catalog.files[1]] };
    assert.equal(selectModpackProfile(updated, 'optimal', ['mousetweaks']).files.length, 1);
    assert.equal(selectModpackProfile({ ...catalog, files: [{ ...catalog.files[0], side: 'both' }] }, 'optimal', ['mousetweaks']).files.length, 1);
  } finally { assert.equal(path.dirname(dir), path.resolve(os.tmpdir())); await fs.rm(dir, { recursive: true, force: true }); }
});
