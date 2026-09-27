import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { prepareSkinLoader } from '../skinLoader';

const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'quiby-skin-loader-'));
try {
  assert.throws(() => prepareSkinLoader(directory, 'https://api.quiby.me'), /не установлен/);
  fs.mkdirSync(path.join(directory, 'mods'));
  fs.writeFileSync(path.join(directory, 'mods', 'CustomSkinLoader_Universal-15.0.1.jar'), 'test');
  prepareSkinLoader(directory, 'https://api.quiby.me/');
  const config = JSON.parse(fs.readFileSync(path.join(directory, 'CustomSkinLoader', 'CustomSkinLoader.json'), 'utf8'));
  assert.equal(config.loadlist[0].skin, 'https://api.quiby.me/api/skins/{USERNAME}.png');
  assert.equal(config.loadlist[0].type, 'Legacy');
} finally {
  fs.rmSync(directory, { recursive: true, force: true });
}
