import { app, BrowserWindow, ipcMain, shell, dialog } from 'electron';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { AuthSession, LauncherSettings } from '@quiby/shared';
import { startDiscordOAuthFlow } from './auth/discordAuth';
import { detectInstalledJava, getRecommendedJava } from './engine/javaDetector';
import { launchMinecraft, killGameProcess } from './engine/minecraftLauncher';
import { initDiscordRpc } from './rpc/discordRpc';

let mainWindow: BrowserWindow | null = null;
let splashWindow: BrowserWindow | null = null;

const DEFAULT_SERVER_URL = 'http://localhost:3001';

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
    splashWindow.loadFile(path.join(__dirname, '../renderer/index.html'), {
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
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
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

  // 6. Game Launching
  ipcMain.handle('game:launch', async (_, session: AuthSession, settings: LauncherSettings, serverUrl: string = DEFAULT_SERVER_URL) => {
    await launchMinecraft(session, settings, serverUrl, mainWindow);
  });

  ipcMain.handle('game:kill', () => {
    killGameProcess();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
