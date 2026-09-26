import { app, BrowserWindow, ipcMain } from 'electron';
import electronUpdater from 'electron-updater';

export type UpdateState = {
  status: 'idle' | 'checking' | 'available' | 'downloading' | 'ready' | 'current' | 'error' | 'development';
  currentVersion: string;
  latestVersion?: string;
  percent?: number;
  message?: string;
};

const { autoUpdater } = electronUpdater;
let state: UpdateState = { status: 'idle', currentVersion: app.getVersion() };

export function registerUpdates(getWindow: () => BrowserWindow | null): void {
  const setState = (patch: Partial<UpdateState>) => {
    state = { ...state, ...patch };
    const window = getWindow();
    if (window && !window.isDestroyed()) window.webContents.send('updates:state', state);
  };
  if (app.isPackaged && process.platform === 'win32') {
    autoUpdater.allowPrerelease = true;
    autoUpdater.channel = 'beta';
    autoUpdater.autoDownload = false;
    autoUpdater.autoInstallOnAppQuit = false;
    autoUpdater.on('checking-for-update', () => setState({ status: 'checking', message: undefined }));
    autoUpdater.on('update-available', info => setState({ status: 'available', latestVersion: info.version }));
    autoUpdater.on('update-not-available', info => setState({ status: 'current', latestVersion: info.version }));
    autoUpdater.on('download-progress', progress => setState({ status: 'downloading', percent: Math.round(progress.percent) }));
    autoUpdater.on('update-downloaded', info => setState({ status: 'ready', latestVersion: info.version, percent: 100 }));
    autoUpdater.on('error', error => setState({ status: 'error', message: error.message }));
    setTimeout(() => void autoUpdater.checkForUpdates().catch(error => setState({ status: 'error', message: String(error) })), 5000);
  } else {
    setState({ status: 'development' });
  }
  ipcMain.handle('updates:state', () => state);
  ipcMain.handle('updates:check', async () => {
    if (!app.isPackaged || process.platform !== 'win32') return state;
    await autoUpdater.checkForUpdates();
    return state;
  });
  ipcMain.handle('updates:download', async () => {
    if (state.status !== 'available') return state;
    await autoUpdater.downloadUpdate();
    return state;
  });
  ipcMain.handle('updates:install', () => {
    if (state.status !== 'ready') return false;
    setImmediate(() => autoUpdater.quitAndInstall(false, true));
    return true;
  });
}
