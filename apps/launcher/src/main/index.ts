import { app, BrowserWindow, ipcMain, shell, dialog, nativeImage, clipboard, ClipboardItem } from 'electron';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { AuthSession, LauncherSettings } from '@quiby/shared';
import { startDiscordOAuthFlow } from './auth/discordAuth';
import { detectInstalledJava, getRecommendedJava } from './engine/javaDetector';
import { launchMinecraft, killGameProcess } from './engine/minecraftLauncher';
import { hashCustomModBytes, requireApprovedCustomMod } from './engine/customModVerification';
import { contentDirectory, contentFilePath, installLocalContent, listLocalContent, ContentKind } from './engine/localContent';
import { configureDiscordRpc } from './rpc/discordRpc';
import { registerUpdates } from './updates';
import { getLatestModpackManifest } from './engine/manifestSource';

let mainWindow: BrowserWindow | null = null;
let splashWindow: BrowserWindow | null = null;
let mainReady = false;
let splashReady = false;
let notificationWrite = Promise.resolve();
const appIcon = app.isPackaged
  ? path.join(process.resourcesPath, 'icon.png')
  : path.join(__dirname, '../../src/renderer/src/assets/quiby_q_logo.png');
app.setName('quiby.core Тестовый');
if (process.platform === 'win32') app.setAppUserModelId('fun.quiby.launcher');
const hasSingleInstanceLock = app.requestSingleInstanceLock();
if (!hasSingleInstanceLock) app.quit();
else app.on('second-instance', () => {
  const window = mainWindow && !mainWindow.isDestroyed() ? mainWindow : splashWindow;
  if (!window || window.isDestroyed()) return;
  if (window.isMinimized()) window.restore();
  window.show();
  window.focus();
});

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
    title: 'quiby.core Тестовый',
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
    title: 'quiby.core Тестовый',
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

if (hasSingleInstanceLock) app.whenReady().then(async () => {

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
    configureDiscordRpc(settings.enableDiscordRpc !== false);
    return true;
  });
  const notificationFile = () => path.join(getDefaultGameDir(), 'notifications.json');
  ipcMain.handle('notifications:load', async () => {
    try {
      const data = JSON.parse(await fs.promises.readFile(notificationFile(), 'utf8'));
      return Array.isArray(data) ? data.filter(item => item && typeof item.id === 'string' && typeof item.title === 'string' && Number.isFinite(item.timestamp)).slice(0, 100) : [];
    } catch { return []; }
  });
  ipcMain.handle('notifications:save', async (_, items: unknown) => {
    if (!Array.isArray(items)) throw new Error('Некорректный список уведомлений');
    const data = JSON.stringify(items.slice(0, 100));
    if (Buffer.byteLength(data) > 20 * 1024 * 1024) throw new Error('История уведомлений слишком велика');
    const file = notificationFile();
    notificationWrite = notificationWrite.catch(() => {}).then(async () => {
      await fs.promises.mkdir(path.dirname(file), { recursive: true });
      await fs.promises.writeFile(`${file}.tmp`, data, 'utf8');
      await fs.promises.rename(`${file}.tmp`, file);
    });
    await notificationWrite;
  });
  ipcMain.handle('notifications:export-log', async (_, content: string) => {
    if (typeof content !== 'string' || !content || Buffer.byteLength(content) > 20 * 1024 * 1024) throw new Error('Лог недоступен');
    const result = await dialog.showSaveDialog(mainWindow!, {
      title: 'Сохранить лог Minecraft',
      defaultPath: `minecraft-crash-${new Date().toISOString().replace(/[:.]/g, '-')}.log`,
      filters: [{ name: 'Лог', extensions: ['log', 'txt'] }],
    });
    if (result.canceled || !result.filePath) return false;
    await fs.promises.writeFile(result.filePath, content, 'utf8');
    return true;
  });

  // 4. Java & System Inspection
  ipcMain.handle('system:memory', () => Math.floor(os.totalmem() / (1024 * 1024)));
  ipcMain.handle('system:detect-java', async () => {
    const installations = await detectInstalledJava(path.join(loadSettings().gameDir?.trim() || getDefaultGameDir(), 'runtime'));
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
  ipcMain.handle('content:open-folder', async (_, gameDir: string, kind: ContentKind | 'mods') => {
    const dir = kind === 'mods' ? path.join(gameDir?.trim() || getDefaultGameDir(), 'mods') : contentDirectory(gameDir?.trim() || getDefaultGameDir(), kind);
    await fs.promises.mkdir(dir, { recursive: true });
    const error = await shell.openPath(dir);
    if (error) throw new Error(error);
  });

  const screenshotDirectory = (gameDir: string) => path.join(gameDir?.trim() || getDefaultGameDir(), 'screenshots');
  const screenshotPath = (gameDir: string, filename: string) => {
    if (!/^[^/\\]+\.(png|jpe?g)$/i.test(filename)) throw new Error('Недопустимое имя скриншота');
    return path.join(screenshotDirectory(gameDir), filename);
  };
  ipcMain.handle('screenshots:list', async (_, gameDir: string) => {
    const dir = screenshotDirectory(gameDir);
    if (!fs.existsSync(dir)) return [];
    const names = await fs.promises.readdir(dir);
    const files = await Promise.all(names.filter(name => /^[^/\\]+\.(png|jpe?g)$/i.test(name)).map(async name => {
      const file = screenshotPath(gameDir, name);
      const stat = await fs.promises.stat(file);
      return stat.isFile() ? { name, modifiedAt: stat.mtimeMs, size: stat.size } : null;
    }));
    return files.filter((file): file is NonNullable<typeof file> => file !== null)
      .sort((a, b) => b.modifiedAt - a.modifiedAt).slice(0, 100);
  });
  ipcMain.handle('screenshots:image', async (_, gameDir: string, filename: string, thumbnail: boolean) => {
    const file = screenshotPath(gameDir, filename);
    const stat = await fs.promises.stat(file);
    if (!stat.isFile() || stat.size > 32 * 1024 * 1024) throw new Error('Скриншот слишком большой или недоступен');
    if (thumbnail) {
      const image = nativeImage.createFromPath(file);
      if (image.isEmpty()) throw new Error('Не удалось открыть скриншот');
      return image.resize({ width: 480, quality: 'good' }).toDataURL();
    }
    const mime = /\.png$/i.test(filename) ? 'image/png' : 'image/jpeg';
    return `data:${mime};base64,${(await fs.promises.readFile(file)).toString('base64')}`;
  });
  ipcMain.handle('screenshots:open-folder', async (_, gameDir: string) => {
    const dir = screenshotDirectory(gameDir);
    await fs.promises.mkdir(dir, { recursive: true });
    const error = await shell.openPath(dir);
    if (error) throw new Error(error);
  });
  ipcMain.handle('screenshots:trash', async (_, gameDir: string, filenames: string[]) => {
    if (!Array.isArray(filenames) || filenames.length > 100) throw new Error('Некорректный список скриншотов');
    for (const filename of filenames) await shell.trashItem(screenshotPath(gameDir, filename));
  });
  ipcMain.handle('screenshots:copy', async (_, gameDir: string, filename: string) => {
    const file = screenshotPath(gameDir, filename);
    const image = nativeImage.createFromPath(file);
    if (image.isEmpty()) throw new Error('Не удалось скопировать скриншот');
    await clipboard.write([new ClipboardItem({ 'image/png': new Blob([new Uint8Array(image.toPNG())], { type: 'image/png' }) })]);
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
  configureDiscordRpc(loadSettings().enableDiscordRpc !== false);
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => configureDiscordRpc(false));
