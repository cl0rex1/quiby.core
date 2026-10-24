import { contextBridge, ipcRenderer } from 'electron';
import { AuthSession, DownloadProgress, LauncherSettings, LaunchState, LogEntry } from '@quiby/shared';
import type { ModpackManifest } from '@quiby/shared';
import type { UpdateState } from '../main/updates';
import type { NotificationItem } from '../renderer/src/utils/notifications';
import type { ResourcePackItem } from '../main/engine/resourcePackCatalog';
import type { DirectRouteReport } from '../shared/directDiagnostics';

export const quibyApi = {
  selectBackground: (): Promise<string | null> => ipcRenderer.invoke('background:select'),
  openResourcePacksFolder: (gameDir: string) => ipcRenderer.invoke('resourcepacks:open-folder', gameDir),
  getResourcePackInventory: (gameDir: string): Promise<ResourcePackItem[]> => ipcRenderer.invoke('resourcepacks:inventory', gameDir),
  trashResourcePack: (gameDir: string, filename: string) => ipcRenderer.invoke('resourcepacks:trash', gameDir, filename),
  getResourcePacks: (gameDir: string, official: { path: string; sha256: string }[], token: string): Promise<ResourcePackItem[]> => ipcRenderer.invoke('resourcepacks:list', gameDir, official, token),
  addResourcePack: (gameDir: string, filename: string, bytes: Uint8Array) => ipcRenderer.invoke('resourcepacks:add', gameDir, filename, bytes),
  stageResourcePackReview: (gameDir: string, filename: string): Promise<string> => ipcRenderer.invoke('resourcepacks:stage-review', gameDir, filename),
  // Window controls
  splashReady: () => ipcRenderer.invoke('splash:ready'),
  minimize: () => ipcRenderer.invoke('window:minimize'),
  maximize: () => ipcRenderer.invoke('window:maximize'),
  isMaximized: (): Promise<boolean> => ipcRenderer.invoke('window:is-maximized'),
  onMaximized: (callback: (maximized: boolean) => void) => {
    const handler = (_: unknown, maximized: boolean) => callback(maximized);
    ipcRenderer.on('window:maximized', handler);
    return () => ipcRenderer.removeListener('window:maximized', handler);
  },
  close: () => ipcRenderer.invoke('window:close'),

  // Settings
  getNetworkReport: (): Promise<DirectRouteReport | null> => ipcRenderer.invoke('network:report'),
  checkNetwork: (token: string): Promise<DirectRouteReport | null> => ipcRenderer.invoke('network:check', token),
  getSettings: (): Promise<LauncherSettings> => ipcRenderer.invoke('settings:get'),
  saveSettings: (settings: LauncherSettings): Promise<boolean> => ipcRenderer.invoke('settings:save', settings),
  loadNotifications: (): Promise<NotificationItem[]> => ipcRenderer.invoke('notifications:load'),
  saveNotifications: (items: NotificationItem[]): Promise<void> => ipcRenderer.invoke('notifications:save', items),
  exportCrashLog: (content: string): Promise<boolean> => ipcRenderer.invoke('notifications:export-log', content),

  // System & Java
  getTotalRamMb: (): Promise<number> => ipcRenderer.invoke('system:memory'),
  detectJava: (): Promise<{ installations: any[]; recommended: any; totalRamMb: number }> =>
    ipcRenderer.invoke('system:detect-java'),
  selectJavaPath: (): Promise<string | null> => ipcRenderer.invoke('system:select-java-path'),
  selectGameDir: (): Promise<string | null> => ipcRenderer.invoke('system:select-game-dir'),
  openPath: (p: string) => ipcRenderer.invoke('system:open-path', p),

  // Auth
  startDiscordLogin: (serverUrl?: string) => ipcRenderer.invoke('auth:discord-login', serverUrl),
  getLatestModpackManifest: (): Promise<ModpackManifest> => ipcRenderer.invoke('modpack:get-manifest'),
  getUpdateState: (): Promise<UpdateState> => ipcRenderer.invoke('updates:state'),
  checkForUpdates: (): Promise<UpdateState> => ipcRenderer.invoke('updates:check'),
  downloadUpdate: (): Promise<UpdateState> => ipcRenderer.invoke('updates:download'),
  installUpdate: (): Promise<boolean> => ipcRenderer.invoke('updates:install'),
  onUpdateState: (callback: (state: UpdateState) => void) => {
    const handler = (_: any, state: UpdateState) => callback(state);
    ipcRenderer.on('updates:state', handler);
    return () => { ipcRenderer.removeListener('updates:state', handler); };
  },

  // Schematics & Shaders
  getSchematics: (gameDir: string) => ipcRenderer.invoke('schematics:list', gameDir),
  getShaderpacks: (gameDir: string) => ipcRenderer.invoke('shaderpacks:list', gameDir),
  installContentFile: (gameDir: string, kind: 'shaderpacks' | 'schematics', filename: string, bytes: Uint8Array): Promise<void> => ipcRenderer.invoke('content:install', gameDir, kind, filename, bytes),
  trashContentFile: (gameDir: string, kind: 'shaderpacks' | 'schematics', filename: string): Promise<void> => ipcRenderer.invoke('content:trash', gameDir, kind, filename),
  openContentFolder: (gameDir: string, kind: 'shaderpacks' | 'schematics' | 'mods'): Promise<void> => ipcRenderer.invoke('content:open-folder', gameDir, kind),
  getScreenshots: (gameDir: string): Promise<{ name: string; modifiedAt: number; size: number }[]> => ipcRenderer.invoke('screenshots:list', gameDir),
  getScreenshotImage: (gameDir: string, filename: string, thumbnail: boolean): Promise<string> => ipcRenderer.invoke('screenshots:image', gameDir, filename, thumbnail),
  openScreenshotsFolder: (gameDir: string): Promise<void> => ipcRenderer.invoke('screenshots:open-folder', gameDir),
  trashScreenshots: (gameDir: string, filenames: string[]): Promise<void> => ipcRenderer.invoke('screenshots:trash', gameDir, filenames),
  copyScreenshot: (gameDir: string, filename: string): Promise<void> => ipcRenderer.invoke('screenshots:copy', gameDir, filename),
  stageCustomMod: (filename: string, bytes: Uint8Array, token?: string) => ipcRenderer.invoke('mods:stage', filename, bytes, token),
  refreshCustomMod: (gameDir: string, filename: string, hash: string, token?: string) => ipcRenderer.invoke('mods:refresh', gameDir, filename, hash, token),
  uploadModReview: (hash: string, token: string, metadata: { mod_name: string; filename: string; reason: string; project_url?: string }) => ipcRenderer.invoke('mods:upload-review', hash, token, metadata),
  installCustomMod: (gameDir: string, filename: string, bytes: Uint8Array, token?: string) =>
    ipcRenderer.invoke('mods:install', gameDir, filename, bytes, token),
  removeCustomMod: (gameDir: string, filename: string) =>
    ipcRenderer.invoke('mods:remove', gameDir, filename),

  // Game Engine
  getLaunchState: (): Promise<LaunchState> => ipcRenderer.invoke('game:state'),
  launchGame: (session: AuthSession, settings: LauncherSettings, customModFilenames?: string[], disabledCustomModFilenames?: string[]) =>
    ipcRenderer.invoke('game:launch', session, settings, customModFilenames, disabledCustomModFilenames),
  preinstallGame: (session: AuthSession, settings: LauncherSettings, customModFilenames?: string[], disabledCustomModFilenames?: string[]) =>
    ipcRenderer.invoke('game:preinstall', session, settings, customModFilenames, disabledCustomModFilenames),
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
