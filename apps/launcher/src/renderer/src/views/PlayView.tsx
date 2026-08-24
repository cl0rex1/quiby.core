import React, { useState } from 'react';
import { Play, RotateCw, CheckCircle2, AlertTriangle, HardDrive, Cpu, Wifi, Copy, Check, Sparkles, Shield, Square } from 'lucide-react';
import { AuthSession, DownloadProgress, LauncherSettings, LaunchState, ModpackManifest, ServerStatus } from '@quiby/shared';

interface PlayViewProps {
  session: AuthSession | null;
  settings: LauncherSettings;
  manifest: ModpackManifest | null;
  serverStatus: ServerStatus | null;
  launchState: LaunchState;
  downloadProgress: DownloadProgress | null;
  onLaunch: () => void;
  onKill: () => void;
  onOpenLogin: () => void;
}

export const PlayView: React.FC<PlayViewProps> = ({
  session,
  settings,
  manifest,
  serverStatus,
  launchState,
  downloadProgress,
  onLaunch,
  onKill,
  onOpenLogin,
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopyIp = () => {
    navigator.clipboard.writeText(settings.serverIp || 'play.quiby.fun:25565');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

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
    <div className="flex-1 flex flex-col justify-between p-6 overflow-y-auto space-y-6">
      {/* Season 6 Hero Showcase */}
      <div className="relative rounded-3xl overflow-hidden border border-quiby-border/80 bg-gradient-to-br from-slate-900 via-quiby-panel to-slate-950 p-8 shadow-2xl">
        {/* Background ambient glow */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-0 left-10 w-72 h-72 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="relative z-10 max-w-2xl space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 text-xs font-bold tracking-wide uppercase">
            <Sparkles size={13} />
            <span>Сезон 6 • Открытие</span>
          </div>

          <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-white leading-tight">
            quiby<span className="text-emerald-400">.</span> Aeronautics
          </h1>

          <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
            Погрузитесь в эру дирижаблей, сложной механики и индустриализации на базе мода{' '}
            <span className="text-white font-semibold">Create & Aeronautics</span>. Официальная сборка на{' '}
            <span className="text-emerald-400 font-semibold">Minecraft 1.21.1 NeoForge</span>.
          </p>

          {/* Quick Specs Badges */}
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-quiby-card/80 border border-quiby-border text-xs text-slate-300">
              <HardDrive size={14} className="text-emerald-400" />
              <span>Память: <strong>{(settings.ramMaxMb / 1024).toFixed(0)} ГБ</strong></span>
            </div>

            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-quiby-card/80 border border-quiby-border text-xs text-slate-300">
              <Cpu size={14} className="text-cyan-400" />
              <span>Java 21 NeoForge</span>
            </div>

            <button
              onClick={handleCopyIp}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-quiby-card/80 border border-quiby-border text-xs text-slate-300 hover:text-white hover:border-emerald-500/40 transition-all cursor-pointer"
            >
              <Wifi size={14} className="text-emerald-400" />
              <span>{settings.serverIp || 'play.quiby.fun'}</span>
              {copied ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
            </button>
          </div>
        </div>
      </div>

      {/* Progress & Launch Bar Area */}
      <div className="bg-quiby-card/90 border border-quiby-border rounded-2xl p-5 shadow-lg space-y-4">
        {/* Active Download Progress */}
        {isBusy && downloadProgress && (
          <div className="space-y-2 animate-in fade-in duration-200">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 text-slate-200 font-medium">
                <RotateCw size={14} className="animate-spin text-emerald-400" />
                <span>{downloadProgress.stageLabel}</span>
              </div>
              <div className="flex items-center gap-3 text-slate-400 font-mono text-[11px]">
                {downloadProgress.speedBps > 0 && (
                  <span className="text-emerald-400 font-bold">{formatSpeed(downloadProgress.speedBps)}</span>
                )}
                {downloadProgress.totalBytes > 0 && (
                  <span>
                    {formatBytes(downloadProgress.bytesDownloaded)} / {formatBytes(downloadProgress.totalBytes)}
                  </span>
                )}
                <span className="font-bold text-white">{downloadProgress.progressPercent}%</span>
              </div>
            </div>

            {/* Visual Bar */}
            <div className="w-full h-2.5 bg-quiby-panel rounded-full overflow-hidden border border-quiby-border">
              <div
                className="h-full bg-gradient-to-r from-emerald-500 to-cyan-400 transition-all duration-300 rounded-full"
                style={{ width: `${Math.max(downloadProgress.progressPercent, 4)}%` }}
              ></div>
            </div>

            {downloadProgress.currentFile && (
              <div className="text-[11px] font-mono text-slate-400 truncate">
                Файл: {downloadProgress.currentFile}
              </div>
            )}
          </div>
        )}

        {/* Action Controls */}
        <div className="flex items-center justify-between gap-4">
          {/* User Account Reminder */}
          <div className="flex items-center gap-3">
            {session ? (
              <div className="flex items-center gap-3">
                <img
                  src={session.user.avatarUrl || `https://api.dicebear.com/8.x/bottts/svg?seed=${session.user.mcUsername}`}
                  alt="Player"
                  className="w-10 h-10 rounded-xl border border-emerald-500/40 object-cover"
                />
                <div>
                  <div className="text-xs text-slate-400">Игровой профиль:</div>
                  <div className="text-sm font-bold text-white flex items-center gap-1.5">
                    <span>{session.user.mcUsername}</span>
                    <span title="Вайтлист активен">
                      <Shield size={13} className="text-emerald-400" />
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-xs text-amber-400 flex items-center gap-2">
                <AlertTriangle size={16} />
                <span>Авторизуйтесь через Discord для запуска игры</span>
              </div>
            )}
          </div>

          {/* Launch / Action Buttons */}
          <div className="flex items-center gap-3">
            {!session ? (
              <button
                onClick={onOpenLogin}
                className="px-8 py-3.5 rounded-xl bg-[#5865F2] hover:bg-[#4752c4] text-white font-bold text-base shadow-lg shadow-[#5865F2]/25 transition-all flex items-center gap-2 cursor-pointer"
              >
                <span>Войти в аккаунт</span>
              </button>
            ) : isRunning ? (
              <button
                onClick={onKill}
                className="px-8 py-3.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-base shadow-lg shadow-red-600/30 transition-all flex items-center gap-2 cursor-pointer"
              >
                <Square size={18} />
                <span>Остановить игру</span>
              </button>
            ) : (
              <button
                onClick={onLaunch}
                disabled={isBusy}
                className="px-10 py-3.5 rounded-xl bg-gradient-to-r from-emerald-500 to-quiby-500 hover:from-emerald-400 hover:to-emerald-500 disabled:opacity-50 text-quiby-dark font-extrabold text-base tracking-wide shadow-glow-green hover:shadow-[0_0_35px_rgba(34,197,94,0.6)] transition-all flex items-center gap-2.5 cursor-pointer transform active:scale-98"
              >
                {isBusy ? (
                  <>
                    <RotateCw size={20} className="animate-spin text-quiby-dark" />
                    <span>СИНХРОНИЗАЦИЯ...</span>
                  </>
                ) : (
                  <>
                    <Play size={20} className="fill-quiby-dark" />
                    <span>ИГРАТЬ (1.21.1 NEOFORGE)</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
