import { app, BrowserWindow, ipcMain, shell, dialog } from 'electron';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { AuthSession, LauncherSettings } from '@quiby/shared';
import { startDiscordOAuthFlow } from './auth/discordAuth';
import { detectInstalledJava, getRecommendedJava } from './engine/javaDetector';
import { launchMinecraft, killGameProcess } from './engine/minecraftLauncher';
import { hashCustomModBytes, requireApprovedCustomMod } from './engine/customModVerification';
import { initDiscordRpc } from './rpc/discordRpc';

let mainWindow: BrowserWindow | null = null;
let splashWindow: BrowserWindow | null = null;

const DEFAULT_SERVER_URL = (process.env.QUIBY_API_URL || import.meta.env.VITE_QUIBY_API_URL || 'http://localhost:3001').replace(/\/$/, '');

function getDefaultGameDir(): string {
  if (process.platform === 'win32') {
    return path.join(process.env.APPDATA || os.homedir(), '.quiby-launcher');
  }
  if (process.platform === 'darwin') {
    return path.join(os.homedir(), 'Library/Application Support/quiby-launcher');
  }
  return path.join(os.homedir(), '.quiby-launcher');
}

function getSettingsFilePath(): string {
  const base = getDefaultGameDir();
  if (!fs.existsSync(base)) fs.mkdirSync(base, { recursive: true });
  return path.join(base, 'launcher-settings.json');
}

function loadSettings(): LauncherSettings {
  const filePath = getSettingsFilePath();
  const totalRamGb = Math.round(os.totalmem() / (1024 * 1024 * 1024));
  const defaultRamMax = Math.min(Math.max(totalRamGb - 2, 4), 8) * 1024;

  const defaults: LauncherSettings = {
    ramMinMb: 4096,
    ramMaxMb: defaultRamMax,
    javaPath: 'java',
    customJvmArgs: '',
    windowWidth: 1280,
    windowHeight: 720,
    fullscreen: false,
    autoCloseLauncher: false,
    gameDir: getDefaultGameDir(),
    enableDiscordRpc: true,
    serverIp: 'play.quiby.fun:25565',
  };

  if (fs.existsSync(filePath)) {
    try {
      const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      return { ...defaults, ...data };
    } catch (_) {}
  }

  return defaults;
}

function saveSettings(settings: LauncherSettings): void {
  const filePath = getSettingsFilePath();
  fs.writeFileSync(filePath, JSON.stringify(settings, null, 2), 'utf8');
}

function createSplashWindow(): void {
  splashWindow = new BrowserWindow({
    width: 440,
    height: 160,
    frame: false,
    resizable: false,
    center: true,
    alwaysOnTop: true,
    backgroundColor: '#07080a',
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  if (process.env.VITE_DEV_SERVER_URL) {
    splashWindow.loadURL(`${process.env.VITE_DEV_SERVER_URL}?view=splash`);
  } else {
    splashWindow.loadFile(path.join(__dirname, '../index.html'), {
      query: { view: 'splash' },
    });
  }

  splashWindow.on('closed', () => {
    splashWindow = null;
  });
}

function createMainWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1100,
    height: 720,
    minWidth: 980,
    minHeight: 620,
    frame: false,
    show: false, // Hidden until splash is ready
    backgroundColor: '#07080a',
    titleBarStyle: 'hidden',
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(path.join(__dirname, '../index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(async () => {
  createSplashWindow();
  createMainWindow();
  initDiscordRpc();

  // 1. Splash Window Transition
  ipcMain.handle('splash:ready', () => {
    if (splashWindow && !splashWindow.isDestroyed()) {
      splashWindow.close();
      splashWindow = null;
    }
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.show();
      mainWindow.focus();
    }
    return true;
  });

  // 2. Window Controls
  ipcMain.handle('window:minimize', () => mainWindow?.minimize());
  ipcMain.handle('window:maximize', () => {
    if (mainWindow?.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow?.maximize();
    }
  });
  ipcMain.handle('window:close', () => mainWindow?.close());

  // 3. Settings IPC
  ipcMain.handle('settings:get', () => loadSettings());
  ipcMain.handle('settings:save', (_, settings: LauncherSettings) => {
    saveSettings(settings);
    return true;
  });

  // 4. Java & System Inspection
  ipcMain.handle('system:detect-java', async () => {
    const installations = await detectInstalledJava();
    const recommended = getRecommendedJava(installations);
    const totalRamMb = Math.round(os.totalmem() / (1024 * 1024));
    return { installations, recommended, totalRamMb };
  });

  ipcMain.handle('system:select-java-path', async () => {
    const res = await dialog.showOpenDialog(mainWindow!, {
      title: 'Выберите исполняемый файл Java 21 (java / javaw.exe)',
      properties: ['openFile'],
    });
    if (!res.canceled && res.filePaths.length > 0) {
      return res.filePaths[0];
    }
    return null;
  });

  ipcMain.handle('system:select-game-dir', async () => {
    const res = await dialog.showOpenDialog(mainWindow!, {
      title: 'Выберите папку с игрой quiby',
      properties: ['openDirectory', 'createDirectory'],
    });
    if (!res.canceled && res.filePaths.length > 0) {
      return res.filePaths[0];
    }
    return null;
  });

  ipcMain.handle('system:open-path', (_, p: string) => {
    shell.openPath(p);
  });

  // 5. Discord Auth Flow
  ipcMain.handle('auth:discord-login', async (_, serverUrl: string = DEFAULT_SERVER_URL) => {
    return await startDiscordOAuthFlow(serverUrl);
  });

  // 6. Schematics & Shaders filesystem handlers
  ipcMain.handle('schematics:list', async (_, gameDir: string) => {
    const targetDir = path.join(gameDir || getDefaultGameDir(), 'schematics');
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
      return [];
    }
    try {
      const files = fs.readdirSync(targetDir);
      return files
        .filter((f) => f.endsWith('.nbt') || f.endsWith('.schem') || f.endsWith('.schematic'))
        .map((f) => {
          const stat = fs.statSync(path.join(targetDir, f));
          return {
            name: f,
            filename: f,
            path: path.join(targetDir, f),
            size: stat.size,
            updatedAt: stat.mtimeMs,
          };
        });
    } catch (_) {
      return [];
    }
  });

  ipcMain.handle('shaderpacks:list', async (_, gameDir: string) => {
    const targetDir = path.join(gameDir || getDefaultGameDir(), 'shaderpacks');
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
      return [];
    }
    try {
      const files = fs.readdirSync(targetDir);
      return files
        .filter((f) => f.endsWith('.zip') || fs.statSync(path.join(targetDir, f)).isDirectory())
        .map((f) => {
          const stat = fs.statSync(path.join(targetDir, f));
          return {
            name: f.replace('.zip', ''),
            filename: f,
            path: path.join(targetDir, f),
            size: stat.size,
            isDirectory: stat.isDirectory(),
            updatedAt: stat.mtimeMs,
          };
        });
    } catch (_) {
      return [];
    }
  });

  ipcMain.handle('mods:install', async (_, gameDir: string, filename: string, bytes: Uint8Array) => {
    if (!/^[^/\\]+\.jar$/i.test(filename) || !bytes?.length || bytes.length > 100 * 1024 * 1024) {
      throw new Error('Недопустимое имя или размер мода');
    }
    const modBytes = Buffer.from(bytes);
    await requireApprovedCustomMod(filename, hashCustomModBytes(modBytes), modBytes.length, DEFAULT_SERVER_URL);
    const modsDir = path.join(gameDir?.trim() || getDefaultGameDir(), 'mods');
    fs.mkdirSync(modsDir, { recursive: true });
    fs.writeFileSync(path.join(modsDir, filename), modBytes);
    return true;
  });

  ipcMain.handle('mods:remove', (_, gameDir: string, filename: string) => {
    if (!/^[^/\\]+\.jar$/i.test(filename)) throw new Error('Недопустимое имя мода');
    const modPath = path.join(gameDir?.trim() || getDefaultGameDir(), 'mods', filename);
    for (const candidate of [modPath, `${modPath}.disabled`]) {
      if (fs.existsSync(candidate)) fs.unlinkSync(candidate);
    }
    return true;
  });

  // 7. Game Launching
  ipcMain.handle(
    'game:launch',
    async (
      _,
      session: AuthSession,
      settings: LauncherSettings,
      customModFilenames: string[] = [],
      disabledCustomModFilenames: string[] = []
    ) => {
      await launchMinecraft(
        session,
        { ...settings, gameDir: settings.gameDir?.trim() || getDefaultGameDir() },
        DEFAULT_SERVER_URL,
        mainWindow,
        customModFilenames,
        disabledCustomModFilenames
      );
    }
  );

  ipcMain.handle('game:kill', () => {
    killGameProcess();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
