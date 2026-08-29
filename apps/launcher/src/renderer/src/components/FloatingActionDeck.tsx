import React, { useState, useEffect } from 'react';
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
  totalCount?: number;
  isAllSelected?: boolean;
  onSelectAll?: () => void;
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
  autoConnect?: boolean;
  onToggleAutoConnect?: (val: boolean) => void;
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
  autoConnect = true,
  onToggleAutoConnect,
  batchActions,
  onLaunch,
  onKill,
  onOpenLogin,
  onSave,
  onCancel,
}) => {
  const [savePhase, setSavePhase] = useState<'idle' | 'filled' | 'sliding'>('idle');
  const [cachedBatchActions, setCachedBatchActions] = useState<BatchActionConfig | null>(batchActions || null);

  useEffect(() => {
    if (batchActions) {
      setCachedBatchActions(batchActions);
    }
  }, [batchActions]);

  const isBusy = launchState.status === 'updating' || launchState.status === 'starting';
  const isRunning = launchState.status === 'running';

  const hasBatch = Boolean(batchActions && batchActions.count > 0);
  const displayBatch = batchActions || cachedBatchActions;
  const isFilled = savePhase === 'filled' || savePhase === 'sliding';
  const isSaveExiting = savePhase === 'sliding';
  const showSave = hasUnsavedChanges || isFilled;

  const formatSpeed = (bps: number) => {
    if (bps <= 0) return '';
    const mbps = (bps / (1024 * 1024)).toFixed(1);
    return `${mbps} МБ/с`;
  };

  const handleSaveClick = async () => {
    // 1. Fill save button with solid emerald + reveal centered checkmark
    setSavePhase('filled');
    await onSave();

    // 2. Hold in green checkmark state for 1 second
    setTimeout(() => {
      // 3. Smoothly slide/fly down with Apple spring settle
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
        {/* Mini Progress HUD (during update/sync) with Apple glassmorphism */}
        {isBusy && downloadProgress && (
          <div className="glass-floating rounded-3xl p-3.5 max-w-xs w-72 space-y-2.5 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="flex items-center justify-between text-xs">
              <span className="text-white font-medium truncate apple-body">{downloadProgress.stageLabel}</span>
              <span className="text-emerald-400 font-mono font-bold">{downloadProgress.progressPercent}%</span>
            </div>

            <div className="w-full h-1.5 bg-zinc-800/80 rounded-full overflow-hidden border border-white/5">
              <div
                className="h-full bg-emerald-400 transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] rounded-full"
                style={{ width: `${Math.max(downloadProgress.progressPercent, 5)}%` }}
              />
            </div>

            <div className="flex items-center justify-between text-[10px] font-mono text-zinc-400">
              {downloadProgress.currentFile ? (
                <span className="truncate max-w-[180px]">{downloadProgress.currentFile}</span>
              ) : (
                <span>Синхронизация...</span>
              )}
              {downloadProgress.speedBps > 0 && (
                <span className="text-zinc-200 font-bold">{formatSpeed(downloadProgress.speedBps)}</span>
              )}
            </div>
          </div>
        )}

        {/* The Floating Play Button & Fast-Connect Toggle with Apple Tactile Press Feedback */}
        <div className="flex items-center gap-3">
          {session && !isRunning && !isBusy && (
            <button
              onClick={() => onToggleAutoConnect?.(!autoConnect)}
              className={`flex items-center gap-2 px-4 py-3.5 rounded-full border transition-all cursor-pointer press-feedback shadow-lg select-none ${
                autoConnect
                  ? 'bg-zinc-900/90 border-emerald-400/40 text-white border-t-emerald-300/60 shadow-[0_4px_20px_rgba(52,211,153,0.15)]'
                  : 'bg-zinc-950/80 border-white/10 text-zinc-400 hover:text-zinc-200'
              }`}
              title="Автоматический вход сразу на сервер play.quiby.fun без захода в главное меню"
            >
              <div
                className={`w-4 h-4 rounded-md flex items-center justify-center border transition-all ${
                  autoConnect
                    ? 'bg-emerald-400 border-emerald-400 text-zinc-950'
                    : 'border-zinc-500 bg-zinc-850'
                }`}
              >
                {autoConnect && <Check size={11} className="stroke-[3.5]" />}
              </div>
              <span className="text-xs font-bold apple-subheading">Сразу на сервер</span>
            </button>
          )}

          {!session ? (
            <button
              onClick={onOpenLogin}
              className="px-8 py-4 rounded-full bg-white hover:bg-neutral-100 text-black font-extrabold text-sm tracking-wide shadow-[0_12px_40px_rgba(0,0,0,0.8)] border border-white/40 press-feedback flex items-center gap-2.5 cursor-pointer uppercase"
            >
              <User size={18} />
              <span>Войти в аккаунт</span>
            </button>
          ) : isRunning ? (
            <button
              onClick={onKill}
              className="px-8 py-4 rounded-full bg-rose-600 hover:bg-rose-500 text-white font-extrabold text-sm tracking-wide shadow-[0_12px_40px_rgba(225,29,72,0.5)] border border-rose-400/40 press-feedback flex items-center gap-2.5 cursor-pointer uppercase"
            >
              <Square size={18} />
              <span>В игре (Остановить)</span>
            </button>
          ) : (
            <button
              onClick={onLaunch}
              disabled={isBusy}
              className="px-9 py-4 rounded-full bg-white hover:bg-neutral-100 disabled:opacity-50 text-black font-black text-base tracking-wider shadow-[0_16px_48px_rgba(0,0,0,0.85)] border border-white/50 press-feedback flex items-center gap-3 cursor-pointer uppercase"
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
      </div>
    );
  }

  // Case 2: Other Tabs -> Dedicated Bottom-Center Actions Window & Bottom-Right Save Window
  return (
    <>
      {/* 1. SEPARATE ACTIONS WINDOW: Positioned in Bottom-Center with Glass Capsule Material */}
      <div
        className={`fixed bottom-8 left-1/2 -translate-x-1/2 z-40 select-none transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
          hasBatch
            ? 'translate-y-0 opacity-100 scale-100 blur-0 pointer-events-auto'
            : 'translate-y-8 opacity-0 scale-95 blur-[2px] pointer-events-none'
        }`}
      >
        {displayBatch && (
          <div className="flex items-center gap-2 p-1.5 rounded-full glass-floating h-[52px]">
            {/* Selected Count / Select All Button */}
            <button
              onClick={displayBatch.onSelectAll}
              className="h-10 px-3.5 rounded-full bg-zinc-800/90 hover:bg-zinc-700/90 border border-white/10 flex items-center justify-center text-xs font-bold text-white font-mono shrink-0 shadow-sm gap-1.5 cursor-pointer press-feedback"
              title={displayBatch.isAllSelected ? 'Снять выбор со всех' : 'Выбрать все моды'}
            >
              <CheckSquare size={14} className={displayBatch.isAllSelected ? 'text-emerald-400' : 'text-zinc-400'} />
              <span>{displayBatch.count}{displayBatch.totalCount ? `/${displayBatch.totalCount}` : ''}</span>
            </button>

            {/* Action: Enable All */}
            <button
              onClick={displayBatch.onEnableAll}
              className="h-10 px-4 rounded-full bg-zinc-800/90 hover:bg-zinc-700/90 border border-white/10 text-xs font-bold text-zinc-200 hover:text-white transition-all flex items-center gap-1.5 cursor-pointer press-feedback shadow-sm shrink-0"
              title="Включить все выбранные моды"
            >
              <ToggleRight size={17} className="text-emerald-400" />
              <span>Включить</span>
            </button>

            {/* Action: Disable All */}
            <button
              onClick={displayBatch.onDisableAll}
              className="h-10 px-4 rounded-full bg-zinc-800/90 hover:bg-zinc-700/90 border border-white/10 text-xs font-bold text-zinc-200 hover:text-white transition-all flex items-center gap-1.5 cursor-pointer press-feedback shadow-sm shrink-0"
              title="Отключить все выбранные моды"
            >
              <ToggleLeft size={17} className="text-zinc-400" />
              <span>Отключить</span>
            </button>

            {/* Action: Delete All */}
            <button
              onClick={displayBatch.onDeleteAll}
              className="w-10 h-10 rounded-full bg-zinc-800/90 hover:bg-rose-950/90 border border-white/10 text-zinc-400 hover:text-rose-400 flex items-center justify-center cursor-pointer press-feedback shrink-0 shadow-sm"
              title="Удалить выбранные моды"
            >
              <Trash2 size={15} />
            </button>

            {/* Dismiss selection */}
            <button
              onClick={displayBatch.onClear}
              className="w-10 h-10 rounded-full bg-zinc-800/90 hover:bg-zinc-700/90 border border-white/10 text-zinc-400 hover:text-white flex items-center justify-center cursor-pointer press-feedback shrink-0 shadow-sm"
              title="Снять выбор"
            >
              <X size={16} />
            </button>
          </div>
        )}
      </div>

      {/* 2. SEPARATE SAVE WINDOW: Positioned in Bottom-Right Corner */}
      <div
        className={`fixed bottom-8 right-8 z-40 select-none pointer-events-auto transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
          showSave && !isSaveExiting
            ? 'translate-y-0 opacity-100 pointer-events-auto'
            : 'translate-y-24 opacity-0 pointer-events-none'
        }`}
      >
        <div
          className={`relative overflow-hidden p-1.5 rounded-full border transition-all duration-300 flex items-center gap-2 ${
            isFilled
              ? 'border-emerald-300 shadow-[0_0_35px_rgba(52,211,153,0.9)]'
              : isShaking
              ? 'animate-shake bg-rose-950/90 border-rose-500 shadow-[0_0_35px_rgba(244,63,94,0.85)] ring-2 ring-rose-500'
              : 'glass-floating'
          }`}
        >
          {/* Cancel Button */}
          <button
            onClick={onCancel}
            disabled={isFilled}
            className="w-10 h-10 rounded-full bg-zinc-800/80 hover:bg-zinc-700/80 text-zinc-400 hover:text-white flex items-center justify-center press-feedback shrink-0 shadow-sm"
            title="Отменить изменения"
          >
            <X size={16} />
          </button>

          {/* Save Button */}
          <button
            onClick={handleSaveClick}
            disabled={isFilled}
            className="px-6 py-2.5 rounded-full bg-white hover:bg-neutral-100 text-black text-xs font-black shadow-md flex items-center gap-1.5 cursor-pointer press-feedback shrink-0"
          >
            <Save size={14} />
            <span>Сохранить</span>
          </button>

          {/* Expanding Solid Green Layer with Centered Checkmark */}
          <div
            className={`absolute inset-0 rounded-full bg-gradient-to-r from-emerald-500 via-emerald-400 to-teal-400 flex items-center justify-center pointer-events-none transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] origin-center z-10 ${
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
    </>
  );
};
