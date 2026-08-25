import React from 'react';
import { Play, RotateCw, Square, User, ShieldCheck } from 'lucide-react';
import { AuthSession, DownloadProgress, LaunchState } from '@quiby/shared';

interface FloatingPlayButtonProps {
  session: AuthSession | null;
  launchState: LaunchState;
  downloadProgress: DownloadProgress | null;
  onLaunch: () => void;
  onKill: () => void;
  onOpenLogin: () => void;
}

export const FloatingPlayButton: React.FC<FloatingPlayButtonProps> = ({
  session,
  launchState,
  downloadProgress,
  onLaunch,
  onKill,
  onOpenLogin,
}) => {
  const isBusy = launchState.status === 'updating' || launchState.status === 'starting';
  const isRunning = launchState.status === 'running';

  const formatSpeed = (bps: number) => {
    if (bps <= 0) return '';
    const mbps = (bps / (1024 * 1024)).toFixed(1);
    return `${mbps} МБ/с`;
  };

  return (
    <div className="fixed bottom-8 right-8 z-30 flex flex-col items-end gap-3 select-none">
      {/* Mini Progress HUD (during update/sync) */}
      {isBusy && downloadProgress && (
        <div className="bg-onyx-900/95 border border-onyx-borderLight rounded-2xl p-3 shadow-2xl backdrop-blur-md max-w-xs w-72 space-y-2 animate-in fade-in slide-in-from-bottom-2 duration-200">
          <div className="flex items-center justify-between text-xs">
            <span className="text-white font-medium truncate">{downloadProgress.stageLabel}</span>
            <span className="text-quiby-purpleLight font-mono font-bold">{downloadProgress.progressPercent}%</span>
          </div>

          <div className="w-full h-1.5 bg-onyx-800 rounded-full overflow-hidden border border-onyx-border">
            <div
              className="h-full bg-gradient-to-r from-quiby-purple via-quiby-purpleLight to-quiby-indigo transition-all duration-300 rounded-full"
              style={{ width: `${Math.max(downloadProgress.progressPercent, 5)}%` }}
            ></div>
          </div>

          <div className="flex items-center justify-between text-[10px] font-mono text-quiby-textMuted">
            {downloadProgress.currentFile ? (
              <span className="truncate max-w-[180px]">{downloadProgress.currentFile}</span>
            ) : (
              <span>Синхронизация...</span>
            )}
            {downloadProgress.speedBps > 0 && (
              <span className="text-quiby-purpleLight font-bold">{formatSpeed(downloadProgress.speedBps)}</span>
            )}
          </div>
        </div>
      )}

      {/* The Floating Play Button */}
      {!session ? (
        <button
          onClick={onOpenLogin}
          className="px-8 py-4 rounded-full bg-white hover:bg-neutral-200 text-black font-extrabold text-sm tracking-wide shadow-2xl hover:scale-105 active:scale-95 transition-all flex items-center gap-2.5 cursor-pointer uppercase"
        >
          <User size={18} />
          <span>Войти в аккаунт</span>
        </button>
      ) : isRunning ? (
        <button
          onClick={onKill}
          className="px-8 py-4 rounded-full bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-sm tracking-wide shadow-2xl hover:scale-105 active:scale-95 transition-all flex items-center gap-2.5 cursor-pointer uppercase"
        >
          <Square size={18} />
          <span>В игре (Остановить)</span>
        </button>
      ) : (
        <button
          onClick={onLaunch}
          disabled={isBusy}
          className="px-9 py-4 rounded-full bg-gradient-to-r from-quiby-purple via-quiby-purpleLight to-quiby-indigo hover:from-quiby-purpleDark hover:to-quiby-purple disabled:opacity-50 text-white font-black text-base tracking-wider shadow-play-btn hover:shadow-[0_0_40px_rgba(139,92,246,0.7)] hover:scale-105 active:scale-95 transition-all flex items-center gap-3 cursor-pointer uppercase"
        >
          {isBusy ? (
            <>
              <RotateCw size={19} className="animate-spin text-white" />
              <span>СИНХРОНИЗАЦИЯ...</span>
            </>
          ) : (
            <>
              <Play size={19} className="fill-white" />
              <span>ИГРАТЬ (1.21.1)</span>
            </>
          )}
        </button>
      )}
    </div>
  );
};
