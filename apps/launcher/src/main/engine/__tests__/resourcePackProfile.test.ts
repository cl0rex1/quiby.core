import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { applyResourcePackProfile } from '../resourcePackProfile';

test('Standard and Draft disable Fresh Animations while Visual enables the installed packs', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'quiby-resource-packs-'));
  const options = path.join(dir, 'options.txt');
  const packPaths = ['resourcepacks/FreshAnimations_v1.10.4.zip', 'resourcepacks/FA+Player-v1.1.zip'];
  try {
    await fs.mkdir(path.join(dir, 'resourcepacks'));
    await fs.writeFile(path.join(dir, 'resourcepacks', 'FreshAnimations_v1.10.4.zip'), '');
    await fs.writeFile(path.join(dir, 'resourcepacks', 'FA+Player-v1.1.zip'), '');
    await fs.writeFile(options, 'renderDistance:12\r\nresourcePacks:["vanilla","file/FreshAnimations_v1.10.4.zip","file/FA+Player-v1.1.zip","file/custom.zip"]\r\n');
    await applyResourcePackProfile(dir, 'optimal', packPaths);
    assert.match(await fs.readFile(options, 'utf8'), /resourcePacks:\["vanilla","file\/custom.zip"\]/);
    await fs.writeFile(options, 'resourcePacks:["vanilla","file/custom.zip","file/manual.zip"]\n');
    await applyResourcePackProfile(dir, 'optimal', packPaths);
    assert.match(await fs.readFile(options, 'utf8'), /file\/manual.zip/, 'in-game changes remain while the profile is unchanged');
    await applyResourcePackProfile(dir, 'full', packPaths);
    const visual = await fs.readFile(options, 'utf8');
    assert.match(visual, /file\/FreshAnimations_v1\.10\.4\.zip/);
    assert.match(visual, /file\/FA\+Player-v1\.1\.zip/);
    await applyResourcePackProfile(dir, 'clean', packPaths);
    assert.doesNotMatch(await fs.readFile(options, 'utf8'), /FreshAnimations|FA\+Player/);
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
});
