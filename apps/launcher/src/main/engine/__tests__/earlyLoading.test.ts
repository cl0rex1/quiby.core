import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { configureEarlyLoading } from '../earlyLoading';

test('early provider preserves settings and restores FML on pack rollback', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'quiby-early-'));
  try {
    const file = path.join(dir, 'config/fml.toml');
    configureEarlyLoading(dir, ['mods/quiby-early-loading-1.21.1-1.1.4.jar']);
    fs.appendFileSync(file, 'earlyWindowWidth = 1280\n[dependencyOverrides]\n');
    configureEarlyLoading(dir, []);
    assert.equal(fs.readFileSync(file, 'utf8'), 'earlyWindowProvider = "fmlearlywindow"\nearlyWindowWidth = 1280\n[dependencyOverrides]\n');
    configureEarlyLoading(dir, ['mods/quiby-early-loading-1.21.1-1.1.4.jar']);
    assert.match(fs.readFileSync(file, 'utf8'), /^earlyWindowProvider = "quiby"\nearlyWindowWidth = 1280/);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});
