import { app, BrowserWindow, ipcMain, shell, dialog } from 'electron';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { AuthSession, LauncherSettings } from '@quiby/shared';
import { startDiscordOAuthFlow } from './auth/discordAuth';
import { detectInstalledJava, getRecommendedJava } from './engine/javaDetector';
import { launchMinecraft, killGameProcess } from './engine/minecraftLauncher';
import { hashCustomModBytes, requireApprovedCustomMod } from './engine/customModVerification';
import { contentDirectory, contentFilePath, installLocalContent, listLocalContent, ContentKind } from './engine/localContent';
import { initDiscordRpc } from './rpc/discordRpc';
import { registerUpdates } from './updates';
import { getLatestModpackManifest } from './engine/manifestSource';

let mainWindow: BrowserWindow | null = null;
let splashWindow: BrowserWindow | null = null;
let mainReady = false;
let splashReady = false;
const appIcon = app.isPackaged
  ? path.join(process.resourcesPath, 'icon.png')
  : path.join(__dirname, '../../src/renderer/src/assets/quiby_q_logo.png');
app.setName('quiby.core');
if (process.platform === 'win32') app.setAppUserModelId('fun.quiby.launcher');

function configureWindow(win: BrowserWindow) {
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:\/\//i.test(url)) void shell.openExternal(url);
    return { action: 'deny' };
  });
  win.webContents.on('will-navigate', (event, url) => {
    if (url !== win.webContents.getURL()) {
      event.preventDefault();
      if (/^https?:\/\//i.test(url)) void shell.openExternal(url);
    }
  });
  win.webContents.on('did-fail-load', (_event, code, description) => {
    if (code === -3) return;
    dialog.showErrorBox('Не удалось открыть quiby.core', description);
    app.quit();
  });
}
function revealMainWindow() {
  if (!mainReady || !splashReady || !mainWindow || mainWindow.isDestroyed()) return;
  mainWindow.show();
  mainWindow.focus();
  splashWindow?.close();
}

const DEFAULT_SERVER_URL = (process.env.QUIBY_API_URL || import.meta.env.VITE_QUIBY_API_URL || 'https://api.quiby.me').replace(/\/$/, '');

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
  };

  if (fs.existsSync(filePath)) {
    try {
      const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      delete data.serverIp; // Drop the obsolete saved address from earlier launcher versions.
      const saved = { ...defaults, ...data };
      saved.ramMaxMb = Number.isFinite(saved.ramMaxMb)
        ? Math.round(saved.ramMaxMb / 1024) * 1024
        : defaults.ramMaxMb;
      return saved;
    } catch (_) {}
  }

  return defaults;
}

function saveSettings(settings: LauncherSettings): void {
  const filePath = getSettingsFilePath();
  fs.writeFileSync(filePath, JSON.stringify(settings, null, 2), 'utf8');
}

function createSplashWindow(): void {
  splashReady = false;
  splashWindow = new BrowserWindow({
    icon: appIcon,
    title: 'quiby.core',
    show: false,
    width: 500,
    height: 300,
    frame: false,
    resizable: false,
    center: true,
    alwaysOnTop: true,
    backgroundColor: '#0c0c0d',
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });
  configureWindow(splashWindow);
  splashWindow.once('ready-to-show', () => splashWindow?.show());

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
  mainReady = false;
  mainWindow = new BrowserWindow({
    icon: appIcon,
    title: 'quiby.core',
    width: 1100,
    height: 720,
    minWidth: 980,
    minHeight: 620,
    frame: false,
    show: false, // Hidden until splash is ready
    backgroundColor: '#0c0c0d',
    titleBarStyle: 'hidden',
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });
  configureWindow(mainWindow);

  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(path.join(__dirname, '../index.html'));
  }

  mainWindow.once('ready-to-show', () => { mainReady = true; revealMainWindow(); });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(async () => {

  // 1. Splash Window Transition
  ipcMain.handle('splash:ready', (event) => {
    if (event.sender !== splashWindow?.webContents) return false;
    setTimeout(() => {
      splashReady = true;
      revealMainWindow();
    }, 1200);
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
  ipcMain.handle('system:memory', () => Math.floor(os.totalmem() / (1024 * 1024)));
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
  for (const kind of ['schematics', 'shaderpacks'] as const) {
    ipcMain.handle(`${kind}:list`, (_, gameDir: string) => listLocalContent(gameDir?.trim() || getDefaultGameDir(), kind));
  }
  ipcMain.handle('content:install', async (_, gameDir: string, kind: ContentKind, filename: string, bytes: Uint8Array) => {
    await installLocalContent(gameDir?.trim() || getDefaultGameDir(), kind, filename, Buffer.from(bytes));
  });
  ipcMain.handle('content:trash', async (_, gameDir: string, kind: ContentKind, filename: string) => {
    await shell.trashItem(contentFilePath(gameDir?.trim() || getDefaultGameDir(), kind, filename));
  });
  ipcMain.handle('content:open-folder', async (_, gameDir: string, kind: ContentKind) => {
    const dir = contentDirectory(gameDir?.trim() || getDefaultGameDir(), kind);
    await fs.promises.mkdir(dir, { recursive: true });
    const error = await shell.openPath(dir);
    if (error) throw new Error(error);
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
      let authResponse: Response;
      try {
        authResponse = await fetch(`${DEFAULT_SERVER_URL}/api/auth/me`, {
          headers: { Authorization: `Bearer ${session?.token || ''}` },
          signal: AbortSignal.timeout(10000),
        });
      } catch {
        throw new Error('Не удалось проверить вход через Discord. Проверьте соединение с сервером.');
      }
      if (!authResponse.ok) {
        throw new Error('Сессия Discord недействительна. Войдите заново.');
      }
      const { user } = await authResponse.json() as { user: AuthSession['user'] };
      if (!user?.isWhitelisted) {
        throw new Error('У аккаунта нет доступа к серверу quiby.');
      }
      await launchMinecraft(
        { ...session, user },
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
  ipcMain.handle('modpack:get-manifest', () => getLatestModpackManifest(DEFAULT_SERVER_URL));
  registerUpdates(() => mainWindow);
  createSplashWindow();
  createMainWindow();
  initDiscordRpc();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
