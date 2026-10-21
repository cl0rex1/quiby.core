export interface ModpackFile {
  profiles?: Array<'full' | 'optimal' | 'clean'>;
  path: string; // relative to game directory (e.g. "mods/create-1.21.1.jar", "config/create.json")
  sha256: string;
  size: number;
  downloadUrl?: string;
  action: 'sync' | 'optional' | 'keep_local';
  side?: 'client' | 'both' | 'server';
  userToggleable?: boolean;
  modId?: string;
  modName?: string;
  modVersion?: string;
  modDescription?: string;
  modProjectUrl?: string;
  modIconUrl?: string;
}

export interface ModpackManifest {
  id: string; // e.g. "quiby-s6"
  name: string; // "quiby. Season 6: Aeronautics"
  version: string; // "6.0.0"
  gameVersion: string; // "1.21.1"
  loader: {
    type: 'neoforge' | 'forge' | 'fabric';
    version: string; // e.g. "21.1.65"
  };
  javaVersion: number; // 21 for MC 1.21.1
  recommendedRamMb: number; // e.g. 8192
  minRamMb: number; // e.g. 4096
  jvmArgs?: string[];
  totalSize: number;
  files: ModpackFile[];
  changelog: string;
  serverAddress: string; // Empty until the Minecraft server is configured.
  updatedAt: string;
}

export interface UserProfile {
  discordId: string;
  username: string;
  discriminator?: string;
  globalName?: string;
  avatar?: string;
  avatarUrl?: string;
  mcUsername: string;
  uuid: string;
  isWhitelisted: boolean;
  roles: string[];
  joinedAt?: string;
  totalPlaytimeSeconds?: number;
}

export interface AuthSession {
  token: string;
  user: UserProfile;
  expiresAt: number;
}

export interface ServerStatus {
  online: boolean;
  ip: string;
  port: number;
  version: string;
  players: {
    online: number;
    max: number;
    sample?: Array<{ name: string; id: string }>;
  };
  motd: {
    raw: string;
    clean: string;
    html?: string;
  };
  latencyMs: number;
  favicon?: string;
}

export interface NewsArticle {
  id: string;
  title: string;
  excerpt: string;
  content: string;
  contentHtml?: string;
  author: string;
  authorAvatar?: string;
  tag: 'update' | 'event' | 'season' | 'announcement';
  date: string;
  bannerUrl?: string;
  pin?: boolean;
  broadcastRevision?: string;
}

export interface LauncherSettings {
  homeBackground?: BackgroundSetting;
  wardrobeBackground?: BackgroundSetting;
  ramMinMb: number;
  ramMaxMb: number;
  javaPath: string;
  customJvmArgs: string;
  windowWidth: number;
  windowHeight: number;
  fullscreen: boolean;
  autoCloseLauncher: boolean;
  gameDir: string;
  enableDiscordRpc: boolean;
  autoJoinServer?: boolean;
  totalPlaytimeSeconds?: number;
  graphicsPreset?: 'potato' | 'optimal' | 'ultra';
  modpackProfile?: 'clean' | 'optimal' | 'full';
  disabledBundledMods?: string[];
}

export interface BackgroundSetting {
  mode: 'default' | 'custom' | 'none';
  imageId?: string;
}

export interface DownloadProgress {
  stage: 'idle' | 'java' | 'checking' | 'manifest' | 'vanilla_assets' | 'libraries' | 'neoforge' | 'mods' | 'configs' | 'launching' | 'error';
  stageLabel: string;
  currentFile: string;
  filesProcessed: number;
  totalFiles: number;
  bytesDownloaded: number;
  totalBytes: number;
  speedBps: number;
  progressPercent: number;
  error?: string;
}

export interface LaunchState {
  status: 'idle' | 'updating' | 'starting' | 'running' | 'crashed' | 'stopped';
  gamePid?: number;
  exitCode?: number;
  error?: string;
}

export interface LogEntry {
  id: string;
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  source: 'launcher' | 'game' | 'neoforge';
}

export { lightingOverrideSignature, hasGammaMixinEvidence } from './lightingDetection';
export { MINIMUM_LAUNCHER_VERSION, LAUNCHER_DOWNLOAD_URL, supportsLauncher } from './launcherPolicy';
