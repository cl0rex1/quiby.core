import { contextBridge, ipcRenderer } from 'electron';
import { AuthSession, DownloadProgress, LauncherSettings, LaunchState, LogEntry } from '@quiby/shared';

export const quibyApi = {
  // Window controls
  splashReady: () => ipcRenderer.invoke('splash:ready'),
  minimize: () => ipcRenderer.invoke('window:minimize'),
  maximize: () => ipcRenderer.invoke('window:maximize'),
  close: () => ipcRenderer.invoke('window:close'),

  // Settings
  getSettings: (): Promise<LauncherSettings> => ipcRenderer.invoke('settings:get'),
  saveSettings: (settings: LauncherSettings): Promise<boolean> => ipcRenderer.invoke('settings:save', settings),

  // System & Java
  detectJava: (): Promise<{ installations: any[]; recommended: any; totalRamMb: number }> =>
    ipcRenderer.invoke('system:detect-java'),
  selectJavaPath: (): Promise<string | null> => ipcRenderer.invoke('system:select-java-path'),
  selectGameDir: (): Promise<string | null> => ipcRenderer.invoke('system:select-game-dir'),
  openPath: (p: string) => ipcRenderer.invoke('system:open-path', p),

  // Auth
  startDiscordLogin: (serverUrl?: string) => ipcRenderer.invoke('auth:discord-login', serverUrl),

  // Schematics & Shaders
  getSchematics: (gameDir: string) => ipcRenderer.invoke('schematics:list', gameDir),
  getShaderpacks: (gameDir: string) => ipcRenderer.invoke('shaderpacks:list', gameDir),

  // Game Engine
  launchGame: (session: AuthSession, settings: LauncherSettings, serverUrl?: string, customModFilenames?: string[]) =>
    ipcRenderer.invoke('game:launch', session, settings, serverUrl, customModFilenames),
  killGame: () => ipcRenderer.invoke('game:kill'),

  // Event Listeners
  onDownloadProgress: (callback: (progress: DownloadProgress) => void) => {
    const handler = (_: any, data: DownloadProgress) => callback(data);
    ipcRenderer.on('download-progress', handler);
    return () => ipcRenderer.removeListener('download-progress', handler);
  },
  onGameLog: (callback: (log: LogEntry) => void) => {
    const handler = (_: any, data: LogEntry) => callback(data);
    ipcRenderer.on('game-log', handler);
    return () => ipcRenderer.removeListener('game-log', handler);
  },
  onLaunchStateChange: (callback: (state: LaunchState) => void) => {
    const handler = (_: any, data: LaunchState) => callback(data);
    ipcRenderer.on('launch-state-change', handler);
    return () => ipcRenderer.removeListener('launch-state-change', handler);
  },
  onPlaytimeTick: (callback: (seconds: number) => void) => {
    const handler = (_: any, sec: number) => callback(sec);
    ipcRenderer.on('playtime-tick', handler);
    return () => ipcRenderer.removeListener('playtime-tick', handler);
  },
  onPlaytimeSessionEnd: (callback: (seconds: number) => void) => {
    const handler = (_: any, sec: number) => callback(sec);
    ipcRenderer.on('playtime-session-end', handler);
    return () => ipcRenderer.removeListener('playtime-session-end', handler);
  },
};

contextBridge.exposeInMainWorld('quibyApi', quibyApi);

declare global {
  interface Window {
    quibyApi: typeof quibyApi;
  }
}
