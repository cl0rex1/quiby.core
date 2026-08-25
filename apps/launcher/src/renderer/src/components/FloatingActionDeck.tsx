import React, { useState } from 'react';
import { Play, RotateCw, Square, User, Save, X, Check } from 'lucide-react';
import { AuthSession, DownloadProgress, LaunchState } from '@quiby/shared';
import { ActiveTab } from './MinimalSidebar';

interface FloatingActionDeckProps {
  activeTab: ActiveTab;
  session: AuthSession | null;
  launchState: LaunchState;
  downloadProgress: DownloadProgress | null;
  hasUnsavedChanges: boolean;
  isShaking: boolean;
  onLaunch: () => void;
  onKill: () => void;
  onOpenLogin: () => void;
  onSave: () => void | Promise<void>;
  onCancel: () => void;
}

export const FloatingActionDeck: React.FC<FloatingActionDeckProps> = ({
  activeTab,
  session,
  launchState,
  downloadProgress,
  hasUnsavedChanges,
  isShaking,
  onLaunch,
  onKill,
  onOpenLogin,
  onSave,
  onCancel,
}) => {
  const [savePhase, setSavePhase] = useState<'idle' | 'filled' | 'sliding'>('idle');
  const isBusy = launchState.status === 'updating' || launchState.status === 'starting';
  const isRunning = launchState.status === 'running';

  const formatSpeed = (bps: number) => {
    if (bps <= 0) return '';
    const mbps = (bps / (1024 * 1024)).toFixed(1);
    return `${mbps} МБ/с`;
  };

  const handleSaveClick = async () => {
    // 1. Smoothly fill with solid green + reveal centered checkmark
    setSavePhase('filled');
    await onSave();

    // 2. Hold in green checkmark state for 1 second
    setTimeout(() => {
      // 3. Smoothly fly down
      setSavePhase('sliding');
    }, 1000);

    // 4. Reset state after sliding finishes
    setTimeout(() => {
      setSavePhase('idle');
    }, 1450);
  };

  // Case 1: On Home Tab -> Primary Play Button
  if (activeTab === 'home') {
    return (
      <div className="fixed bottom-8 right-8 z-40 flex flex-col items-end gap-3 select-none">
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
  }

  // Case 2: On Other Tabs -> Clean In-Place Solid Green Fill & Fly Down
  const isFilled = savePhase === 'filled' || savePhase === 'sliding';
  const isSlidingDown = savePhase === 'sliding' || (!hasUnsavedChanges && savePhase === 'idle');

  return (
    <div
      className={`fixed bottom-8 right-8 z-40 transition-all duration-300 ease-out select-none ${
        isSlidingDown
          ? 'translate-y-24 opacity-0 pointer-events-none'
          : 'translate-y-0 opacity-100 pointer-events-auto'
      }`}
    >
      <div
        className={`relative overflow-hidden p-1.5 rounded-full border transition-all duration-300 flex items-center gap-2 ${
          isFilled
            ? 'border-emerald-300 shadow-[0_0_35px_rgba(52,211,153,0.9)]'
            : isShaking
            ? 'animate-shake bg-rose-950/90 border-rose-500 shadow-[0_0_35px_rgba(244,63,94,0.85)] ring-2 ring-rose-500'
            : 'bg-onyx-900/90 border-onyx-borderLight shadow-2xl backdrop-blur-md'
        }`}
      >
        {/* Base Buttons (Cross Cancel + Save Button) */}
        <button
          onClick={onCancel}
          disabled={isFilled}
          className="w-10 h-10 rounded-full bg-onyx-800 hover:bg-onyx-750 text-quiby-textMuted hover:text-white flex items-center justify-center transition-all cursor-pointer active:scale-95 shrink-0"
          title="Отменить изменения"
        >
          <X size={16} />
        </button>

        <button
          onClick={handleSaveClick}
          disabled={isFilled}
          className="px-6 py-2.5 rounded-full bg-white hover:bg-neutral-200 text-black text-xs font-black transition-all shadow-md flex items-center gap-1.5 cursor-pointer active:scale-95 shrink-0"
        >
          <Save size={14} />
          <span>Сохранить</span>
        </button>

        {/* Clean Expanding Solid Green Layer with Centered Checkmark */}
        <div
          className={`absolute inset-0 rounded-full bg-emerald-400 flex items-center justify-center pointer-events-none transition-all duration-300 ease-out origin-center z-10 ${
            isFilled ? 'scale-100 opacity-100' : 'scale-0 opacity-0'
          }`}
        >
          {isFilled && (
            <div className="flex items-center justify-center animate-in zoom-in-75 duration-200">
              <Check size={22} className="text-black stroke-[3.5]" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
