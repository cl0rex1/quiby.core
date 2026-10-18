import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(path.join(root, 'packages/pack-builder/package.json'));
const Zip = require('adm-zip');
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'modpacks/quiby-s6/manifest.json'), 'utf8'));
const zip = new Zip();
for (const id of ['quiby', 'offbalance', 'create_radar', 'createnuclear']) {
  const file = manifest.files.find(file => file.modId === id);
  if (!file?.downloadUrl.startsWith('/api/modpack/files/')) throw new Error(`Missing local artifact: ${id}`);
  const bytes = fs.readFileSync(path.join(root, 'apps/server/storage/files', decodeURIComponent(file.downloadUrl.slice('/api/modpack/files/'.length))));
  if (crypto.createHash('sha256').update(bytes).digest('hex') !== file.sha256) throw new Error(`Hash mismatch: ${id}`);
  zip.addFile(file.path, bytes);
}
for (const directory of ['config', 'defaultconfigs']) {
  for (const filename of ['offbalance-server.toml', 'quiby-server.toml', 'sable_player_ragdoll-server.toml']) {
    zip.addLocalFile(path.join(root, 'modpacks/quiby-s6/overrides', directory, filename), directory);
  }
}
zip.addFile('README.md', fs.readFileSync(path.join(root, `docs/server-update-${manifest.version}.md`)));
const output = path.join(root, 'temp', `quiby-server-update-${manifest.version}.zip`);
fs.mkdirSync(path.dirname(output), { recursive: true });
zip.writeZip(output);
console.log(output);
