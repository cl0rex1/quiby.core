import React, { useState } from 'react';
import { 
  Play, 
  RotateCw, 
  Square, 
  User, 
  Save, 
  X, 
  Check, 
  Trash2, 
  ToggleRight, 
  ToggleLeft,
  CheckSquare
} from 'lucide-react';
import { AuthSession, DownloadProgress, LaunchState } from '@quiby/shared';
import { ActiveTab } from './MinimalSidebar';

export interface BatchActionConfig {
  count: number;
  onEnableAll: () => void;
  onDisableAll: () => void;
  onDeleteAll: () => void;
  onClear: () => void;
}

interface FloatingActionDeckProps {
  activeTab: ActiveTab;
  session: AuthSession | null;
  launchState: LaunchState;
  downloadProgress: DownloadProgress | null;
  hasUnsavedChanges: boolean;
  isShaking: boolean;
  batchActions?: BatchActionConfig | null;
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
  batchActions,
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
          <div className="bg-zinc-900/95 border border-white/10 rounded-2xl p-3 shadow-2xl backdrop-blur-md max-w-xs w-72 space-y-2 animate-in fade-in slide-in-from-bottom-2 duration-200">
            <div className="flex items-center justify-between text-xs">
              <span className="text-white font-medium truncate">{downloadProgress.stageLabel}</span>
              <span className="text-emerald-400 font-mono font-bold">{downloadProgress.progressPercent}%</span>
            </div>

            <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden border border-white/5">
              <div
                className="h-full bg-emerald-400 transition-all duration-300 rounded-full"
                style={{ width: `${Math.max(downloadProgress.progressPercent, 5)}%` }}
              />
            </div>

            <div className="flex items-center justify-between text-[10px] font-mono text-zinc-500">
              {downloadProgress.currentFile ? (
                <span className="truncate max-w-[180px]">{downloadProgress.currentFile}</span>
              ) : (
                <span>Синхронизация...</span>
              )}
              {downloadProgress.speedBps > 0 && (
                <span className="text-zinc-300 font-bold">{formatSpeed(downloadProgress.speedBps)}</span>
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
            className="px-9 py-4 rounded-full bg-white hover:bg-neutral-200 disabled:opacity-50 text-black font-black text-base tracking-wider shadow-2xl hover:scale-105 active:scale-95 transition-all flex items-center gap-3 cursor-pointer uppercase"
          >
            {isBusy ? (
              <>
                <RotateCw size={19} className="animate-spin text-black" />
                <span>СИНХРОНИЗАЦИЯ...</span>
              </>
            ) : (
              <>
                <Play size={19} className="fill-black text-black" />
                <span>ИГРАТЬ (1.21.1)</span>
              </>
            )}
          </button>
        )}
      </div>
    );
  }

  // Case 2: Other Tabs with Metaball / Dual-Pod Separation Animation
  const isFilled = savePhase === 'filled' || savePhase === 'sliding';
  const isSaveExiting = savePhase === 'sliding';
  const showSavePod = hasUnsavedChanges || isFilled;
  const hasBatch = Boolean(batchActions && batchActions.count > 0);

  // If nothing to show at all:
  if (!showSavePod && !hasBatch) {
    return null;
  }

  return (
    <div className="fixed bottom-8 right-8 z-40 flex items-center gap-3 select-none pointer-events-auto">
      {/* Pod 1: Batch Actions Capsule (Multi-Selection) */}
      {hasBatch && batchActions && (
        <div
          className={`flex items-center gap-2 p-1.5 rounded-full bg-zinc-900/95 border border-white/10 shadow-2xl backdrop-blur-md transition-all duration-400 ease-[cubic-bezier(0.16,1,0.3,1)] animate-in fade-in zoom-in-95 ${
            isSaveExiting ? 'translate-x-0' : ''
          }`}
        >
          {/* Selected Count Indicator */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-zinc-800 text-xs font-bold text-white font-mono">
            <CheckSquare size={13} className="text-emerald-400" />
            <span>{batchActions.count}</span>
          </div>

          {/* Action: Enable All */}
          <button
            onClick={batchActions.onEnableAll}
            className="px-3 py-1.5 rounded-full bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold text-zinc-200 hover:text-white transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
            title="Включить все выбранные моды"
          >
            <ToggleRight size={15} className="text-emerald-400" />
            <span className="hidden sm:inline">Включить</span>
          </button>

          {/* Action: Disable All */}
          <button
            onClick={batchActions.onDisableAll}
            className="px-3 py-1.5 rounded-full bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold text-zinc-200 hover:text-white transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
            title="Отключить все выбранные моды"
          >
            <ToggleLeft size={15} className="text-zinc-400" />
            <span className="hidden sm:inline">Отключить</span>
          </button>

          {/* Action: Delete All */}
          <button
            onClick={batchActions.onDeleteAll}
            className="p-2 rounded-full bg-zinc-800 hover:bg-rose-950/80 text-zinc-400 hover:text-rose-400 transition-all cursor-pointer active:scale-95"
            title="Удалить выбранные моды"
          >
            <Trash2 size={14} />
          </button>

          {/* Dismiss selection */}
          <button
            onClick={batchActions.onClear}
            className="p-2 rounded-full text-zinc-500 hover:text-white transition-colors cursor-pointer"
            title="Снять выбор"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Pod 2: Save & Cancel Capsule (With Metaball Organic Division Effect) */}
      {showSavePod && (
        <div
          className={`transition-all duration-300 ease-out ${
            isSaveExiting
              ? 'translate-y-24 opacity-0 pointer-events-none'
              : 'translate-y-0 opacity-100'
          }`}
        >
          <div
            className={`relative overflow-hidden p-1.5 rounded-full border transition-all duration-300 flex items-center gap-2 ${
              isFilled
                ? 'border-emerald-300 shadow-[0_0_35px_rgba(52,211,153,0.9)]'
                : isShaking
                ? 'animate-shake bg-rose-950/90 border-rose-500 shadow-[0_0_35px_rgba(244,63,94,0.85)] ring-2 ring-rose-500'
                : 'bg-zinc-900/95 border-white/10 shadow-2xl backdrop-blur-md'
            }`}
          >
            {/* Cancel Button */}
            <button
              onClick={onCancel}
              disabled={isFilled}
              className="w-10 h-10 rounded-full bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white flex items-center justify-center transition-all cursor-pointer active:scale-95 shrink-0"
              title="Отменить изменения"
            >
              <X size={16} />
            </button>

            {/* Save Button */}
            <button
              onClick={handleSaveClick}
              disabled={isFilled}
              className="px-6 py-2.5 rounded-full bg-white hover:bg-neutral-200 text-black text-xs font-black transition-all shadow-md flex items-center gap-1.5 cursor-pointer active:scale-95 shrink-0"
            >
              <Save size={14} />
              <span>Сохранить</span>
            </button>

            {/* Expanding Solid Green Checkmark Layer */}
            <div
              className={`absolute inset-0 rounded-full bg-gradient-to-r from-emerald-500 via-emerald-400 to-teal-400 flex items-center justify-center pointer-events-none transition-all duration-300 ease-out origin-center z-10 ${
                isFilled ? 'scale-100 opacity-100 shadow-[0_0_30px_rgba(52,211,153,0.9)]' : 'scale-0 opacity-0'
              }`}
            >
              {isFilled && (
                <div className="flex items-center justify-center animate-in zoom-in-75 duration-200">
                  <Check size={22} className="text-zinc-950 stroke-[3.5]" />
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
