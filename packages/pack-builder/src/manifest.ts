import fs from 'fs';
import path from 'path';
import { glob } from 'glob';
import { ModpackFile, ModpackManifest } from '@quiby/shared';
import { hashFileSha256 } from './hasher';
import { extractModMetadata } from './modExtractor';

export interface PackConfig {
  id?: string;
  name?: string;
  version?: string;
  gameVersion?: string;
  loaderType?: 'neoforge' | 'forge' | 'fabric';
  loaderVersion?: string;
  recommendedRamMb?: number;
  minRamMb?: number;
  jvmArgs?: string[];
  changelog?: string;
}

export async function buildManifestFromDir(
  dirPath: string,
  options: {
    version?: string;
    changelog?: string;
    serverBaseUrl?: string;
  } = {}
): Promise<ModpackManifest> {
  const absDir = path.resolve(dirPath);
  const packJsonPath = path.join(absDir, 'pack.json');

  let packConfig: PackConfig = {
    id: 'quiby-s6-aeronautics',
    name: 'quiby. Season 6: Aeronautics',
    version: options.version || '6.0.0',
    gameVersion: '1.21.1',
    loaderType: 'neoforge',
    loaderVersion: '21.1.65',
    recommendedRamMb: 8192,
    minRamMb: 4096,
    changelog: options.changelog || 'Season 6 update',
  };

  if (fs.existsSync(packJsonPath)) {
    try {
      const raw = JSON.parse(fs.readFileSync(packJsonPath, 'utf8'));
      packConfig = { ...packConfig, ...raw };
    } catch (e) {
      console.warn('⚠️ Could not parse pack.json, using defaults.');
    }
  }

  // Scan included folders
  const targetPatterns = [
    'mods/**/*.jar',
    'config/**/*',
    'defaultconfigs/**/*',
    'kubejs/**/*',
    'resourcepacks/**/*',
    'shaderpacks/**/*',
    'options.txt',
  ];

  const matchedFiles = await glob(targetPatterns, {
    cwd: absDir,
    nodir: true,
    dot: false,
  });

  const files: ModpackFile[] = [];
  let totalSize = 0;

  for (const relPath of matchedFiles) {
    const fullPath = path.join(absDir, relPath);
    const stat = fs.statSync(fullPath);
    const sha256 = await hashFileSha256(fullPath);

    totalSize += stat.size;

    let modInfo: any = {};
    if (relPath.startsWith('mods/') && relPath.endsWith('.jar')) {
      const meta = extractModMetadata(fullPath);
      modInfo = {
        modId: meta.modId,
        modName: meta.modName,
        modVersion: meta.modVersion,
        modDescription: meta.description,
        modProjectUrl: meta.projectUrl,
      };
    }

    const downloadUrl = options.serverBaseUrl
      ? `${options.serverBaseUrl}/api/modpack/files/${relPath}`
      : `/api/modpack/files/${relPath}`;

    files.push({
      path: relPath.replace(/\\/g, '/'),
      sha256,
      size: stat.size,
      downloadUrl,
      action: 'sync',
      ...modInfo,
    });
  }

  const manifest: ModpackManifest = {
    id: packConfig.id || 'quiby-s6-aeronautics',
    name: packConfig.name || 'quiby. Season 6: Aeronautics',
    version: options.version || packConfig.version || '6.0.0',
    gameVersion: '1.21.1',
    loader: {
      type: packConfig.loaderType || 'neoforge',
      version: packConfig.loaderVersion || '21.1.65',
    },
    javaVersion: 21,
    recommendedRamMb: packConfig.recommendedRamMb || 8192,
    minRamMb: packConfig.minRamMb || 4096,
    jvmArgs: packConfig.jvmArgs || [
      '-XX:+UseG1GC',
      '-XX:+ParallelRefProcEnabled',
      '-XX:MaxGCPauseMillis=200',
      '-XX:+UnlockExperimentalVMOptions',
      '-XX:+DisableExplicitGC',
      '-XX:+AlwaysPreTouch',
    ],
    totalSize,
    files,
    changelog: options.changelog || packConfig.changelog || 'Season 6 update',
    serverAddress: '',
    updatedAt: new Date().toISOString(),
  };

  return manifest;
}
