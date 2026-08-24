import fs from 'fs';
import path from 'path';
import { execFile } from 'child_process';
import { BrowserWindow } from 'electron';
import { downloadFile } from './downloader';

export async function ensureNeoForge(
  mcVersion: string = '1.21.1',
  loaderVersion: string = '21.1.65',
  gameDir: string,
  javaPath: string,
  win: BrowserWindow | null
): Promise<{ versionId: string; mainClass: string }> {
  const versionId = `${mcVersion}-neoforge-${loaderVersion}`;
  const neoforgeVersionDir = path.join(gameDir, 'versions', versionId);
  const versionJsonPath = path.join(neoforgeVersionDir, `${versionId}.json`);

  if (fs.existsSync(versionJsonPath)) {
    return { versionId, mainClass: 'cpw.mods.bootstraplauncher.BootstrapLauncher' };
  }

  // Download NeoForge Installer
  const installerUrl = `https://maven.neoforged.net/releases/net/neoforged/neoforge/${loaderVersion}/neoforge-${loaderVersion}-installer.jar`;
  const installerPath = path.join(gameDir, 'temp', `neoforge-${loaderVersion}-installer.jar`);

  if (win && !win.isDestroyed()) {
    win.webContents.send('download-progress', {
      stage: 'neoforge',
      stageLabel: `Загрузка установщика NeoForge ${loaderVersion} для Minecraft ${mcVersion}...`,
      progressPercent: 50,
    });
  }

  await downloadFile(installerUrl, installerPath);

  // Run headless installer if java is available
  if (fs.existsSync(javaPath)) {
    if (win && !win.isDestroyed()) {
      win.webContents.send('download-progress', {
        stage: 'neoforge',
        stageLabel: `Установка профиля NeoForge ${loaderVersion}...`,
        progressPercent: 75,
      });
    }

    await new Promise<void>((resolve, reject) => {
      execFile(
        javaPath,
        ['-jar', installerPath, '--installClient', gameDir],
        { cwd: gameDir },
        (error, stdout, stderr) => {
          if (error) {
            console.warn('NeoForge automated installer notice:', stderr || error.message);
            // Non-fatal if offline or fallback profile exists
          }
          resolve();
        }
      );
    });
  }

  return { versionId, mainClass: 'cpw.mods.bootstraplauncher.BootstrapLauncher' };
}
