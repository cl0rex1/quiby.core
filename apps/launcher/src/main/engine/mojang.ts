import fs from 'fs';
import path from 'path';
import os from 'os';
import { BrowserWindow } from 'electron';
import { downloadFile } from './downloader';

export interface MojangVersionInfo {
  id: string;
  assetIndex: {
    id: string;
    sha1: string;
    size: number;
    url: string;
    totalSize: number;
  };
  downloads: {
    client: {
      sha1: string;
      size: number;
      url: string;
    };
  };
  libraries: Array<{
    rules?: Array<{ action: 'allow' | 'disallow'; os?: { name?: string; arch?: string; version?: string } }>;
    downloads?: {
      artifact?: {
        path: string;
        sha1: string;
        size: number;
        url: string;
      };
    };
    name: string;
  }>;
  mainClass: string;
}

export function isLibraryAllowed(lib: MojangVersionInfo['libraries'][number], platform = process.platform, arch = process.arch): boolean {
  const osName = platform === 'win32' ? 'windows' : platform === 'darwin' ? 'osx' : 'linux';
  let allowed = !lib.rules?.length;
  for (const rule of lib.rules || []) {
    if (rule.os?.name && rule.os.name !== osName) continue;
    if (rule.os?.arch && !new RegExp(rule.os.arch).test(arch === 'x64' ? 'amd64' : arch === 'arm64' ? 'aarch64' : 'x86')) continue;
    if (rule.os?.version && !new RegExp(rule.os.version).test(os.release())) continue;
    allowed = rule.action === 'allow';
  }
  const classifier = lib.name.split(':')[3];
  if (classifier?.startsWith('natives-')) {
    const nativeArch = classifier.endsWith('-arm64') ? 'arm64' : classifier.endsWith('-x86') ? 'ia32' : 'x64';
    if (nativeArch !== arch) return false;
  }
  return allowed;
}

export async function ensureMinecraftVanilla(
  version: string = '1.21.1',
  gameDir: string,
  win: BrowserWindow | null
): Promise<{ clientJar: string; versionJson: MojangVersionInfo; libraries: string[] }> {
  const versionsDir = path.join(gameDir, 'versions', version);
  const clientJar = path.join(versionsDir, `${version}.jar`);
  const versionJsonPath = path.join(versionsDir, `${version}.json`);

  if (!fs.existsSync(versionsDir)) {
    fs.mkdirSync(versionsDir, { recursive: true });
  }

  // 1. Fetch version manifest
  if (!fs.existsSync(versionJsonPath)) {
    if (win && !win.isDestroyed()) {
      win.webContents.send('download-progress', {
        stage: 'manifest',
        stageLabel: `Получение манифеста Minecraft ${version}...`,
        progressPercent: 10,
      });
    }

    const manifestRes = await fetch('https://piston-meta.mojang.com/mc/game/version_manifest_v2.json', { signal: AbortSignal.timeout(15000) });
    if (!manifestRes.ok) throw new Error(`Mojang: HTTP ${manifestRes.status}`);
    const manifest = await manifestRes.json();
    const targetVer = manifest.versions.find((v: any) => v.id === version);
    if (!targetVer) {
      throw new Error(`Minecraft version ${version} not found in Mojang manifest.`);
    }

    await downloadFile(targetVer.url, versionJsonPath, undefined, targetVer.sha1);
  }

  const versionJson: MojangVersionInfo = JSON.parse(fs.readFileSync(versionJsonPath, 'utf8'));

  // 2. Download client.jar if missing
  if (!fs.existsSync(clientJar) || fs.statSync(clientJar).size !== versionJson.downloads.client.size) {
    if (win && !win.isDestroyed()) {
      win.webContents.send('download-progress', {
        stage: 'manifest',
        stageLabel: `Загрузка Minecraft ${version} client.jar...`,
        progressPercent: 30,
      });
    }
    await downloadFile(versionJson.downloads.client.url, clientJar, undefined, versionJson.downloads.client.sha1);
  }

  // 3. Collect libraries
  const libraryPaths: string[] = [];
  const librariesDir = path.join(gameDir, 'libraries');

  for (const lib of versionJson.libraries) {
    if (!isLibraryAllowed(lib)) continue;
    if (lib.downloads?.artifact) {
      const art = lib.downloads.artifact;
      const libPath = path.join(librariesDir, art.path);
      libraryPaths.push(libPath);

      if (!fs.existsSync(libPath) || fs.statSync(libPath).size !== art.size) {
        await downloadFile(art.url, libPath, undefined, art.sha1);
      }
    }
  }

  // 4. Download Asset Index and missing objects
  const assetIndexDir = path.join(gameDir, 'assets', 'indexes');
  const assetIndexPath = path.join(assetIndexDir, `${versionJson.assetIndex.id}.json`);
  if (!fs.existsSync(assetIndexPath) || fs.statSync(assetIndexPath).size !== versionJson.assetIndex.size) {
    if (!fs.existsSync(assetIndexDir)) fs.mkdirSync(assetIndexDir, { recursive: true });
    await downloadFile(versionJson.assetIndex.url, assetIndexPath, undefined, versionJson.assetIndex.sha1);
  }

  await ensureMinecraftAssets(assetIndexPath, gameDir, win);

  return { clientJar, versionJson, libraries: libraryPaths };
}

async function ensureMinecraftAssets(
  assetIndexPath: string,
  gameDir: string,
  win: BrowserWindow | null
): Promise<void> {
  if (!fs.existsSync(assetIndexPath)) return;
  try {
    const raw = fs.readFileSync(assetIndexPath, 'utf8');
    const index = JSON.parse(raw);
    const objects = index.objects;
    if (!objects || typeof objects !== 'object') throw new Error('Некорректный индекс ресурсов Minecraft');

    const objectsDir = path.join(gameDir, 'assets', 'objects');
    if (!fs.existsSync(objectsDir)) fs.mkdirSync(objectsDir, { recursive: true });

    // Collect missing objects
    const missing: Array<{ hash: string; subDir: string; destPath: string; url: string }> = [];
    const seen = new Set<string>();
    for (const key of Object.keys(objects)) {
      const { hash, size } = objects[key];
      if (typeof hash !== 'string' || !/^[a-f0-9]{40}$/i.test(hash)) throw new Error('Некорректный хеш ресурса Minecraft');
      if (seen.has(hash)) continue;
      seen.add(hash);
      const subDir = hash.substring(0, 2);
      const destPath = path.join(objectsDir, subDir, hash);
      if (!fs.existsSync(destPath) || fs.statSync(destPath).size !== size) {
        missing.push({
          hash,
          subDir,
          destPath,
          url: `https://resources.download.minecraft.net/${subDir}/${hash}`,
        });
      }
    }

    if (missing.length === 0) return;

    if (win && !win.isDestroyed()) {
      win.webContents.send('download-progress', {
        stage: 'manifest',
        stageLabel: `Синхронизация ассетов Minecraft (${missing.length} файлов)...`,
        progressPercent: 35,
      });
    }

    // Download missing assets in parallel batches of 12
    const concurrency = 12;
    let completed = 0;
    for (let i = 0; i < missing.length; i += concurrency) {
      const batch = missing.slice(i, i + concurrency);
      const results = await Promise.allSettled(
        batch.map(async (item) => {
          await downloadFile(item.url, item.destPath, undefined, item.hash);
          completed++;
        })
      );
      const failure = results.find(result => result.status === 'rejected');
      if (failure?.status === 'rejected') throw failure.reason;
      if (win && !win.isDestroyed() && i % 48 === 0) {
        const pct = Math.round(35 + (completed / missing.length) * 15);
        win.webContents.send('download-progress', {
          stage: 'manifest',
          stageLabel: `Синхронизация ассетов: ${completed} / ${missing.length}`,
          progressPercent: pct,
        });
      }
    }
  } catch (err) {
    throw new Error(`Не удалось загрузить ресурсы Minecraft: ${err instanceof Error ? err.message : String(err)}`);
  }
}
