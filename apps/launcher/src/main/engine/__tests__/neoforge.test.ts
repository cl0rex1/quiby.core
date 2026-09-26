import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { ensureNeoForge, mavenCoordinateToPath, prepareInstallerDirectory } from '../neoforge';
import { isLibraryAllowed } from '../mojang';

test('NeoForge reuses the real installer profile without running Java', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'quiby-neoforge-'));
  try {
    prepareInstallerDirectory(dir);
    const marker = path.join(dir, 'launcher_profiles.json');
    fs.writeFileSync(marker, '{"profiles":{"existing":{}}}');
    prepareInstallerDirectory(dir);
    assert.equal(fs.readFileSync(marker, 'utf8'), '{"profiles":{"existing":{}}}');
    const id = 'neoforge-21.1.250';
    const coordinate = 'net.neoforged:neoforge:21.1.250:client';
    const library = path.join(dir, 'libraries', mavenCoordinateToPath(coordinate));
    fs.mkdirSync(path.dirname(library), { recursive: true });
    fs.writeFileSync(library, 'fixture');
    const versionDir = path.join(dir, 'versions', id);
    fs.mkdirSync(versionDir, { recursive: true });
    fs.writeFileSync(path.join(versionDir, `${id}.json`), JSON.stringify({
      id, inheritsFrom: '1.21.1', mainClass: 'example.Main', libraries: [{ name: coordinate }],
      arguments: { jvm: ['-DlibraryDirectory=${library_directory}'], game: ['--launchTarget', 'neoforgeclient'] },
    }));
    const profile = await ensureNeoForge('1.21.1', '21.1.250', dir, 'must-not-run', null);
    assert.equal(profile.versionId, id);
    assert.deepEqual(profile.libraries, [library]);
    assert.equal(profile.jvmArgs[0], `-DlibraryDirectory=${path.join(dir, 'libraries')}`);
    assert.equal(mavenCoordinateToPath('a.b:c:1:client@zip'), 'a/b/c/1/c-1-client.zip');
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('Mojang rules exclude other operating systems and native architectures', () => {
  const windowsNative = { name: 'org.lwjgl:lwjgl:3:natives-windows', rules: [{ action: 'allow' as const, os: { name: 'windows' } }] };
  assert.equal(isLibraryAllowed(windowsNative, 'win32', 'x64'), true);
  assert.equal(isLibraryAllowed(windowsNative, 'linux', 'x64'), false);
  assert.equal(isLibraryAllowed(windowsNative, 'win32', 'arm64'), false);
  assert.equal(isLibraryAllowed({ ...windowsNative, name: 'org.lwjgl:lwjgl:3:natives-windows-arm64' }, 'win32', 'arm64'), true);
  assert.equal(isLibraryAllowed({ name: 'normal:library:1' }, 'win32', 'x64'), true);
});
