import fs from 'fs';
import path from 'path';
import { execFile } from 'child_process';
import type { BrowserWindow } from 'electron';
import { downloadFile } from './downloader';

export interface NeoForgeLaunchDetails {
  versionId: string;
  mainClass: string;
  jvmArgs: string[];
  gameArgs: string[];
  libraries: string[];
}

export function mavenCoordinateToPath(coord: string): string {
  const [coordinate, ext = 'jar'] = coord.split('@');
  const [group, name, version, classifier] = coordinate.split(':');
  if (!group || !name || !version) throw new Error(`Invalid Maven coordinate: ${coord}`);
  return `${group.replace(/\./g, '/')}/${name}/${version}/${name}-${version}${classifier ? `-${classifier}` : ''}.${ext}`;
}

export function prepareInstallerDirectory(gameDir: string): void {
  fs.mkdirSync(gameDir, { recursive: true });
  const profiles = path.join(gameDir, 'launcher_profiles.json');
  if (!fs.existsSync(profiles)) fs.writeFileSync(profiles, JSON.stringify({ profiles: {}, settings: {}, version: 3 }));
}

export async function ensureNeoForge(
  mcVersion = '1.21.1', loaderVersion = '21.1.250', gameDir: string,
  javaPath: string, win: BrowserWindow | null,
): Promise<NeoForgeLaunchDetails> {
  const versionId = `neoforge-${loaderVersion}`;
  const versionJsonPath = path.join(gameDir, 'versions', versionId, `${versionId}.json`);
  const librariesDir = path.join(gameDir, 'libraries');
  const readProfile = (): NeoForgeLaunchDetails | null => {
    if (!fs.existsSync(versionJsonPath)) return null;
    const data = JSON.parse(fs.readFileSync(versionJsonPath, 'utf8'));
    if (data.id !== versionId || data.inheritsFrom !== mcVersion || !data.mainClass) return null;
    const libraries = (data.libraries || []).map((lib: any) => path.join(librariesDir,
      lib.downloads?.artifact?.path || mavenCoordinateToPath(lib.name)));
    if (!libraries.length || libraries.some((file: string) => !fs.existsSync(file) || fs.statSync(file).size === 0)) return null;
    const resolveArg = (arg: string) => arg
      .replace(/\$\{library_directory\}/g, librariesDir)
      .replace(/\$\{classpath_separator\}/g, path.delimiter)
      .replace(/\$\{version_name\}/g, versionId);
    return {
      versionId, mainClass: data.mainClass, libraries,
      jvmArgs: (data.arguments?.jvm || []).filter((arg: unknown) => typeof arg === 'string').map(resolveArg),
      gameArgs: (data.arguments?.game || []).filter((arg: unknown) => typeof arg === 'string'),
    };
  };
  const existing = readProfile();
  if (existing) return existing;
  // NeoForge expects this marker even for a third-party launcher.
  prepareInstallerDirectory(gameDir);
  const installerPath = path.join(gameDir, 'temp', `${versionId}-installer.jar`);
  const progress = (label: string) => {
    if (win && !win.isDestroyed()) win.webContents.send('download-progress', {
      stage: 'neoforge', stageLabel: label, progressPercent: 65,
    });
  };
  progress(`Загрузка установщика NeoForge ${loaderVersion}...`);
  if (!fs.existsSync(installerPath)) {
    await downloadFile(`https://maven.neoforged.net/releases/net/neoforged/neoforge/${loaderVersion}/${versionId}-installer.jar`, installerPath);
  }
  progress(`Установка NeoForge ${loaderVersion}. Подготовка библиотек может занять несколько минут...`);
  const logPath = path.join(gameDir, 'temp', `${versionId}-install.log`);
  await new Promise<void>((resolve, reject) => {
    execFile(javaPath.replace(/javaw\.exe$/i, 'java.exe') || 'java', ['-jar', installerPath, '--installClient', gameDir],
      { cwd: gameDir, windowsHide: true, maxBuffer: 32 * 1024 * 1024, timeout: 15 * 60 * 1000 },
      (error, stdout, stderr) => {
        fs.writeFileSync(logPath, `${stdout}\n${stderr}`);
        if (error) {
          const detail = `${stdout}\n${stderr}`.trim().split(/\r?\n/).slice(-12).join('\n');
          reject(new Error(`NeoForge не установлен. ${detail || error.message}\nЖурнал: ${logPath}`));
        } else resolve();
      });
  });
  const installed = readProfile();
  if (!installed) throw new Error(`Установка NeoForge неполная. Проверьте журнал: ${logPath}`);
  return installed;
}
