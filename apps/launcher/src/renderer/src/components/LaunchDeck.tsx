import React from 'react';
import { 
  Play, 
  RotateCw, 
  Square, 
  User, 
  ShieldCheck, 
  HardDrive, 
  Cpu, 
  LogOut, 
  Sparkles,
  Layers
} from 'lucide-react';
import { AuthSession, DownloadProgress, LauncherSettings, LaunchState, ModpackManifest } from '@quiby/shared';

interface LaunchDeckProps {
  session: AuthSession | null;
  settings: LauncherSettings;
  manifest: ModpackManifest | null;
  launchState: LaunchState;
  downloadProgress: DownloadProgress | null;
  onLaunch: () => void;
  onKill: () => void;
  onOpenLogin: () => void;
  onLogout: () => void;
}

export const LaunchDeck: React.FC<LaunchDeckProps> = ({
  session,
  settings,
  manifest,
  launchState,
  downloadProgress,
  onLaunch,
  onKill,
  onOpenLogin,
  onLogout,
}) => {
  const isBusy = launchState.status === 'updating' || launchState.status === 'starting';
  const isRunning = launchState.status === 'running';

  const formatSpeed = (bps: number) => {
    if (bps <= 0) return '';
    const mbps = (bps / (1024 * 1024)).toFixed(1);
    return `${mbps} МБ/с`;
  };

  const formatBytes = (bytes: number) => {
    if (!bytes) return '0 МБ';
    return `${(bytes / (1024 * 1024)).toFixed(1)} МБ`;
  };

  return (
    <div className="bg-quiby-bg/95 backdrop-blur-xl border-t border-quiby-border px-6 py-4 flex flex-col gap-3 shadow-deck z-40 select-none">
      {/* Live Download Progress HUD (When updating) */}
      {isBusy && downloadProgress && (
        <div className="w-full bg-quiby-card/90 border border-quiby-border/90 rounded-2xl p-3.5 space-y-2 animate-in fade-in slide-in-from-bottom-2 duration-200">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 text-white font-medium">
              <RotateCw size={14} className="animate-spin text-quiby-purpleLight" />
              <span>{downloadProgress.stageLabel}</span>
            </div>
            <div className="flex items-center gap-3 text-quiby-textMuted font-mono text-[11px]">
              {downloadProgress.speedBps > 0 && (
                <span className="text-quiby-purpleLight font-bold">{formatSpeed(downloadProgress.speedBps)}</span>
              )}
              {downloadProgress.totalBytes > 0 && (
                <span>
                  {formatBytes(downloadProgress.bytesDownloaded)} / {formatBytes(downloadProgress.totalBytes)}
                </span>
              )}
              <span className="font-bold text-white">{downloadProgress.progressPercent}%</span>
            </div>
          </div>

          <div className="w-full h-2 bg-black/60 rounded-full overflow-hidden border border-quiby-border/80">
            <div
              className="h-full bg-gradient-to-r from-quiby-purple via-quiby-purpleLight to-quiby-indigo transition-all duration-300 rounded-full shadow-neon-purple"
              style={{ width: `${Math.max(downloadProgress.progressPercent, 4)}%` }}
            ></div>
          </div>

          {downloadProgress.currentFile && (
            <div className="text-[11px] font-mono text-quiby-textMuted truncate">
              {downloadProgress.currentFile}
            </div>
          )}
        </div>
      )}

      {/* Main Deck Controls Bar */}
      <div className="flex items-center justify-between gap-6">
        {/* Left: User Profile Pill */}
        <div className="flex items-center gap-3 min-w-[220px]">
          {session ? (
            <div className="flex items-center gap-3 p-1.5 pr-3 rounded-2xl bg-quiby-card/80 border border-quiby-border shadow-sm">
              <img
                src={session.user.avatarUrl || `https://api.dicebear.com/8.x/bottts/svg?seed=${session.user.mcUsername}`}
                alt="Avatar"
                className="w-10 h-10 rounded-xl border border-quiby-purple/40 object-cover shrink-0"
              />
              <div className="flex flex-col truncate">
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-white text-sm truncate">{session.user.mcUsername}</span>
                  <span title="Вайтлист активен">
                    <ShieldCheck size={14} className="text-quiby-purpleLight shrink-0" />
                  </span>
                </div>
                <span className="text-[11px] text-quiby-textMuted truncate font-mono">@{session.user.username}</span>
              </div>
              <button
                onClick={onLogout}
                title="Сменить аккаунт"
                className="ml-auto p-1.5 text-quiby-textMuted hover:text-red-400 hover:bg-white/5 rounded-lg transition-colors"
              >
                <LogOut size={14} />
              </button>
            </div>
          ) : (
            <button
              onClick={onOpenLogin}
              className="flex items-center gap-2.5 p-2 px-4 rounded-2xl bg-quiby-card hover:bg-quiby-cardHover border border-quiby-border text-xs font-bold text-white transition-all shadow-sm group cursor-pointer"
            >
              <div className="w-8 h-8 rounded-xl bg-quiby-purple/20 flex items-center justify-center text-quiby-purpleLight group-hover:scale-110 transition-transform">
                <User size={16} />
              </div>
              <div className="text-left">
                <span className="block font-bold">Войти в аккаунт</span>
                <span className="text-[10px] text-quiby-textMuted font-normal">Discord OAuth2</span>
              </div>
            </button>
          )}
        </div>

        {/* Center: The Grand Radiant Play Button */}
        <div className="flex-1 max-w-md flex justify-center">
          {!session ? (
            <button
              onClick={onOpenLogin}
              className="w-full py-4 rounded-2xl bg-gradient-to-r from-quiby-purpleDark to-quiby-purple hover:from-quiby-purple hover:to-quiby-accent text-white font-extrabold text-sm tracking-wider shadow-neon-purple hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2.5 cursor-pointer uppercase"
            >
              <User size={18} />
              <span>Авторизоваться через Discord</span>
            </button>
          ) : isRunning ? (
            <button
              onClick={onKill}
              className="w-full py-4 rounded-2xl bg-red-600 hover:bg-red-700 text-white font-extrabold text-sm tracking-wider shadow-lg shadow-red-600/30 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2.5 cursor-pointer uppercase"
            >
              <Square size={18} />
              <span>В игре (Остановить Minecraft)</span>
            </button>
          ) : (
            <button
              onClick={onLaunch}
              disabled={isBusy}
              className="w-full py-4 rounded-2xl bg-gradient-to-r from-quiby-purpleDark via-quiby-purple to-quiby-indigo hover:from-quiby-purple hover:via-quiby-purpleLight hover:to-quiby-purple disabled:opacity-50 text-white font-black text-base tracking-wider shadow-neon-purple hover:shadow-[0_0_40px_rgba(139,92,246,0.6)] hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3 cursor-pointer uppercase"
            >
              {isBusy ? (
                <>
                  <RotateCw size={20} className="animate-spin text-white" />
                  <span>СИНХРОНИЗАЦИЯ...</span>
                </>
              ) : (
                <>
                  <Play size={20} className="fill-white" />
                  <span>ИГРАТЬ (1.21.1 NEOFORGE)</span>
                </>
              )}
            </button>
          )}
        </div>

        {/* Right: Quick Specs Badges */}
        <div className="flex items-center gap-2.5 min-w-[220px] justify-end">
          <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-quiby-card/80 border border-quiby-border text-xs text-quiby-text font-mono shadow-sm">
            <HardDrive size={14} className="text-quiby-purpleLight" />
            <span>{(settings.ramMaxMb / 1024).toFixed(0)} ГБ RAM</span>
          </div>

          <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-quiby-card/80 border border-quiby-border text-xs text-quiby-text font-mono shadow-sm">
            <Cpu size={14} className="text-quiby-purpleLight" />
            <span>Java 21</span>
          </div>
        </div>
      </div>
    </div>
  );
};
