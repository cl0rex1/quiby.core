import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import type { ModpackFile, ModpackManifest } from '@quiby/shared';
import { extractModMetadata } from '../packages/pack-builder/src/modExtractor';
import { config } from '../apps/server/src/config';
import { initDatabase, closeDatabase } from '../apps/server/src/models/db';
import { publishModpackVersion } from '../apps/server/src/services/modpackService';

// Only curated game content is imported; never copy the entire personal profile.
const source = path.resolve(process.argv[2] || '');
const loaderVersion = process.argv[3];
const version = process.argv[4] || '6.1.0';
const files: ModpackFile[] = [];
const skipped: string[] = [];

async function add(relative: string, sourcePath: string, profiles?: ModpackFile['profiles']) {
  let data = await fs.readFile(sourcePath);
  if (relative === 'options.txt') {
    data = Buffer.from(data.toString().split(/\r?\n/).filter(line =>
      !/^(lastServer|fullscreen|overrideWidth|overrideHeight|soundDevice):/.test(line)
    ).join('\n'));
  }
  if (relative === 'config/explosionoverhaul/explosionoverhaul-client.toml') {
    const text = data.toString();
    if (!/firstLaunchComplete\s*=\s*(true|false)/.test(text)) throw new Error('Explosion Overhaul setup flag missing');
    data = Buffer.from(text.replace(/firstLaunchComplete\s*=\s*(true|false)/, 'firstLaunchComplete = true'));
  }
  const sha256 = crypto.createHash('sha256').update(data).digest('hex');
  const existing = files.find(file => file.path === relative && file.sha256 === sha256);
  if (existing) {
    if (profiles && existing.profiles) existing.profiles.push(...profiles);
    return;
  }
  const storageRelative = `imported/${sha256}/${path.basename(relative)}`;
  const destination = path.join(config.storagePath, 'files', storageRelative);
  await fs.mkdir(path.dirname(destination), { recursive: true });
  await fs.writeFile(destination, data);
  const isMod = relative.startsWith('mods/');
  const metadata = isMod ? extractModMetadata(sourcePath) : undefined;
  files.push({
    path: relative, sha256, size: data.length, profiles,
    downloadUrl: `/api/modpack/files/${storageRelative.split('/').map(encodeURIComponent).join('/')}`,
    action: /^(mods|resourcepacks|shaderpacks|config\/explosionoverhaul)\//.test(relative) ? 'sync' : 'keep_local',
    ...(metadata ? { modId: metadata.modId, modName: metadata.modName, modVersion: metadata.modVersion } : {}),
  });
}

async function walk(relative: string) {
  const entries = await fs.readdir(path.join(source, relative), { withFileTypes: true }).catch((error) => {
    if (error.code === 'ENOENT') return [];
    throw error;
  });
  for (const entry of entries) {
    const child = `${relative}/${entry.name}`;
    if (entry.isSymbolicLink() || /(?:\.bak|\.log|\.lock)$|(?:^|\/)(?:tmp|tmp-client|tasks)(?:\/|$)|cache|fingerprint|favorites|etf_warnings|README/i.test(child)) {
      skipped.push(child);
      continue;
    }
    if (entry.isDirectory()) await walk(child);
    else if (entry.isFile()) {
      if (child.startsWith('shaderpacks/') && !entry.name.startsWith('ComplementaryUnbound')) continue;
      if (/voicechat\/(?:player-volumes|category-volumes|translations)/.test(child)) continue;
      await add(child, path.join(source, child), child.startsWith('shaderpacks/') ? ['full'] : undefined);
    }
  }
}

async function main() {
  if (!process.argv[2] || !loaderVersion || !/^21\.1\.\d+$/.test(loaderVersion)) {
    throw new Error('Usage: npm run pack:import -- <profile-directory> <NeoForge-version> [pack-version]');
  }
  for (const [folder, profile] of [['mods', 'full'], ['mods-Standard', 'optimal'], ['mods-Draft', 'clean']] as const) {
    const entries = await fs.readdir(path.join(source, folder));
    const mods = entries.filter(name => name.endsWith('.jar')).sort();
    if (!mods.length) throw new Error(`No mods in ${folder}`);
    for (const name of mods) await add(`mods/${name}`, path.join(source, folder, name), [profile]);
    console.log(`${folder}: ${mods.length} mods`);
  }
  for (const folder of ['config', 'defaultconfigs', 'kubejs', 'resourcepacks', 'shaderpacks']) await walk(folder);
  await add('options.txt', path.join(source, 'options.txt'));
  files.sort((a, b) => a.path.localeCompare(b.path));
  const manifest: ModpackManifest = {
    id: 'quiby-s6', name: 'quiby. Season 6', version, gameVersion: '1.21.1',
    loader: { type: 'neoforge', version: loaderVersion }, javaVersion: 21,
    recommendedRamMb: 8192, minRamMb: 4096, totalSize: files.reduce((sum, file) => sum + file.size, 0),
    files, changelog: 'Visual, Standard и Draft из профиля quiby. s6; исходные настройки и Complementary Unbound.',
    serverAddress: '', updatedAt: new Date().toISOString(),
  };
  const output = path.resolve('modpacks/quiby-s6');
  await fs.mkdir(output, { recursive: true });
  await fs.writeFile(path.join(output, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
  await initDatabase();
  await publishModpackVersion(manifest);
  console.log(`Activated ${version}: ${files.length} entries, ${(manifest.totalSize / 1024 / 1024).toFixed(1)} MiB. Skipped ${skipped.length} cache/backup entries.`);
}

main().catch(error => { console.error(error); process.exitCode = 1; }).finally(closeDatabase);
