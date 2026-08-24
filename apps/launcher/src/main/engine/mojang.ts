import fs from 'fs';
import path from 'path';
import { BrowserWindow } from 'electron';
import { downloadFile, computeFileSha256 } from './downloader';

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

    const manifestRes = await fetch('https://piston-meta.mojang.com/mc/game/version_manifest_v2.json');
    const manifest = await manifestRes.json();
    const targetVer = manifest.versions.find((v: any) => v.id === version);
    if (!targetVer) {
      throw new Error(`Minecraft version ${version} not found in Mojang manifest.`);
    }

    const verRes = await fetch(targetVer.url);
    const verData = await verRes.text();
    fs.writeFileSync(versionJsonPath, verData, 'utf8');
  }

  const versionJson: MojangVersionInfo = JSON.parse(fs.readFileSync(versionJsonPath, 'utf8'));

  // 2. Download client.jar if missing
  if (!fs.existsSync(clientJar) || fs.statSync(clientJar).size < 1000) {
    if (win && !win.isDestroyed()) {
      win.webContents.send('download-progress', {
        stage: 'manifest',
        stageLabel: `Загрузка Minecraft ${version} client.jar...`,
        progressPercent: 30,
      });
    }
    await downloadFile(versionJson.downloads.client.url, clientJar);
  }

  // 3. Collect libraries
  const libraryPaths: string[] = [];
  const librariesDir = path.join(gameDir, 'libraries');

  for (const lib of versionJson.libraries) {
    if (lib.downloads?.artifact) {
      const art = lib.downloads.artifact;
      const libPath = path.join(librariesDir, art.path);
      libraryPaths.push(libPath);

      if (!fs.existsSync(libPath)) {
        await downloadFile(art.url, libPath);
      }
    }
  }

  // 4. Download Asset Index
  const assetIndexDir = path.join(gameDir, 'assets', 'indexes');
  const assetIndexPath = path.join(assetIndexDir, `${versionJson.assetIndex.id}.json`);
  if (!fs.existsSync(assetIndexPath)) {
    if (!fs.existsSync(assetIndexDir)) fs.mkdirSync(assetIndexDir, { recursive: true });
    await downloadFile(versionJson.assetIndex.url, assetIndexPath);
  }

  return { clientJar, versionJson, libraries: libraryPaths };
}
