import fs from 'fs';
import path from 'path';
import os from 'os';
import http from 'http';
import crypto from 'crypto';
import { syncModpackFiles, computeFileSha256, downloadFile } from '../downloader';
import { ModpackManifest } from '@quiby/shared';

async function runTests() {
  console.log('🧪 Starting Downloader & Mod Preservation Test Suite...');
  let passed = 0;
  let failed = 0;

  const assert = (condition: boolean, message: string) => {
    if (!condition) {
      console.error(`  ❌ FAIL: ${message}`);
      failed++;
    } else {
      console.log(`  ✅ PASS: ${message}`);
      passed++;
    }
  };

  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'quiby-test-mods-'));
  const modsDir = path.join(tempDir, 'mods');
  fs.mkdirSync(modsDir, { recursive: true });

  try {
    // Setup files in modsDir
    const manifestModPath = path.join(modsDir, 'manifest-mod.jar');
    fs.writeFileSync(manifestModPath, 'manifest-mod-content');
    const manifestModHash = await computeFileSha256(manifestModPath);

    const customModPath = path.join(modsDir, 'custom-mod.jar');
    fs.writeFileSync(customModPath, 'custom-mod-content');

    const disabledModPath = path.join(modsDir, 'user-mod.jar.disabled');
    fs.writeFileSync(disabledModPath, 'user-disabled-content');

    const obsoleteModPath = path.join(modsDir, 'obsolete-cheat-mod.jar');
    fs.writeFileSync(obsoleteModPath, 'obsolete-content');

    const mockManifest: ModpackManifest = {
      id: 's6',
      name: 'Season 6',
      version: '1.0.0',
      gameVersion: '1.21.1',
      loader: { type: 'neoforge', version: '21.1.65' },
      javaVersion: 21,
      recommendedRamMb: 8192,
      minRamMb: 4096,
      changelog: 'Initial release',
      serverAddress: '',
      updatedAt: new Date().toISOString(),
      files: [
        {
          path: 'mods/manifest-mod.jar',
          sha256: manifestModHash,
          size: 20,
          action: 'sync',
        },
      ],
      totalSize: 20,
    };

    // Run sync with custom-mod.jar in protectedModFilenames
    const protectedFiles = new Set(['custom-mod.jar']);
    await syncModpackFiles(mockManifest, tempDir, 'http://localhost:3001', null, protectedFiles);

    // 1. Check manifest mod is kept
    assert(fs.existsSync(manifestModPath), 'Manifest mod file is preserved');

    // 2. Check protected custom mod is kept
    assert(fs.existsSync(customModPath), 'Protected custom mod file is preserved');

    // 3. Check .jar.disabled mod is preserved
    assert(fs.existsSync(disabledModPath), 'Disabled .jar.disabled mod is preserved');

    // 4. Check obsolete mod was deleted
    assert(!fs.existsSync(obsoleteModPath), 'Unprotected obsolete mod is deleted cleanly');

    // 5. Check protection when protected set contains .disabled filename
    const customMod2Path = path.join(modsDir, 'another-mod.jar');
    fs.writeFileSync(customMod2Path, 'another-mod-content');
    const protectedWithDisabled = new Set(['another-mod.jar.disabled']);
    await syncModpackFiles(mockManifest, tempDir, 'http://localhost:3001', null, protectedWithDisabled);
    assert(fs.existsSync(customMod2Path), 'Mod is preserved when protectedModFilenames contains .disabled variant');

    let rejectedTraversal = false;
    try {
      await syncModpackFiles(
        { ...mockManifest, files: [{ ...mockManifest.files[0], path: '../outside.jar' }] },
        tempDir,
        'http://localhost:3001',
        null
      );
    } catch (_) {
      rejectedTraversal = true;
    }
    assert(rejectedTraversal, 'Manifest path traversal is rejected before writing files');

    const payload = Buffer.alloc(2 * 1024 * 1024, 0x5a);
    const server = http.createServer((_req, res) => res.end(payload));
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    try {
      const port = (server.address() as { port: number }).port;
      const downloadedPath = path.join(tempDir, 'large-download.jar');
      await downloadFile(`http://127.0.0.1:${port}/file`, downloadedPath);
      assert(
        await computeFileSha256(downloadedPath) === crypto.createHash('sha256').update(payload).digest('hex'),
        'Download resolves only after the complete file reaches disk'
      );
    } finally {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }

  } catch (err) {
    console.error('Test execution error:', err);
    failed++;
  } finally {
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch (_) {}
  }

  console.log('\n========================================');
  console.log(`📊 Downloader Test Summary: ${passed} Passed, ${failed} Failed`);
  console.log('========================================\n');

  if (failed > 0) process.exit(1);
}

runTests();
