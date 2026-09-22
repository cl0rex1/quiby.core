import React, { useState, useEffect, useRef } from 'react';
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
  CheckSquare,
  Copy,
  ArrowDownCircle,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { AuthSession, DownloadProgress, LaunchState, LogEntry } from '@quiby/shared';
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
  logs?: LogEntry[];
  onClearLogs?: () => void;
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
  logs = [],
  onClearLogs,
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
  const [isLogsCollapsed, setIsLogsCollapsed] = useState(false);
  const [autoScroll, setAutoScroll] = useState(true);
  const [copiedLogs, setCopiedLogs] = useState(false);
  const logsBottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (autoScroll && !isLogsCollapsed) {
      logsBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, autoScroll, isLogsCollapsed]);

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

  const handleCopyLogs = () => {
    const text = logs
      .map((l) => `[${l.timestamp}] [${l.source.toUpperCase()}/${l.level.toUpperCase()}]: ${l.message}`)
      .join('\n');
    navigator.clipboard.writeText(text);
    setCopiedLogs(true);
    setTimeout(() => setCopiedLogs(false), 2000);
  };

  const getLogLevelClass = (level: LogEntry['level']) => {
    switch (level) {
      case 'error':
        return 'text-rose-400 font-semibold';
      case 'warn':
        return 'text-amber-400 font-medium';
      case 'debug':
        return 'text-purple-300';
      default:
        return 'text-zinc-300';
    }
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

  // Case 1: On Home Tab -> Anchored Bottom Launch Dock with Docked Sync/Console HUD
  if (activeTab === 'home') {
    return (
      <div className="fixed bottom-0 left-[72px] right-0 h-20 bg-zinc-950/95 border-t border-white/10 backdrop-blur-md px-6 sm:px-8 flex items-center justify-between z-30 select-none">
        {/* Left Side: Server Status & Quick Ping */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-400" />
            </span>
            <span className="text-xs font-mono font-bold text-zinc-200">play.quiby.fun</span>
          </div>
          <span className="text-zinc-600 font-bold">•</span>
          <span className="text-xs text-emerald-400 font-mono font-semibold bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-md">
            Онлайн
          </span>
        </div>

        {/* Center / Controls: Fast-Connect Toggle */}
        <div className="flex items-center gap-3">
          {session && !isRunning && !isBusy && (
            <button
              onClick={() => onToggleAutoConnect?.(!autoConnect)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl border transition-all cursor-pointer press-feedback text-xs font-semibold select-none ${
                autoConnect
                  ? 'bg-zinc-900 border-emerald-500/30 text-emerald-300'
                  : 'bg-zinc-900/50 border-white/10 text-zinc-400 hover:text-zinc-200'
              }`}
              title="Автоматический вход сразу на сервер без перехода в главное меню"
            >
              <div
                className={`w-3.5 h-3.5 rounded flex items-center justify-center border transition-all ${
                  autoConnect
                    ? 'bg-emerald-400 border-emerald-400 text-zinc-950'
                    : 'border-zinc-500 bg-zinc-800'
                }`}
              >
                {autoConnect && <Check size={10} className="stroke-[3.5]" />}
              </div>
              <span>Сразу на сервер</span>
            </button>
          )}
        </div>

        {/* Right Side: Primary Play Button with Docked Floating Console/Progress HUD */}
        <div className="relative flex items-center gap-3">
          {/* Docked Sync-to-Console HUD Card (Anchored directly above the launch bar) */}
          {isBusy && downloadProgress && !isRunning ? (
            <div className="absolute bottom-24 right-0 glass-floating rounded-2xl p-3.5 w-80 space-y-2.5 shadow-2xl transition-all duration-300 animate-in fade-in slide-in-from-bottom-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-white font-medium truncate flex items-center gap-2">
                  <RotateCw size={13} className="animate-spin text-emerald-400 shrink-0" />
                  <span className="truncate">{downloadProgress.stageLabel}</span>
                </span>
                <span className="text-emerald-400 font-mono font-bold">{downloadProgress.progressPercent}%</span>
              </div>

              <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden border border-white/5">
                <div
                  className="h-full bg-emerald-400 transition-all duration-300 rounded-full"
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
          ) : isRunning ? (
            <div
              className={`absolute bottom-24 right-0 flex flex-col bg-zinc-950 border border-white/15 rounded-2xl shadow-2xl backdrop-blur-xl overflow-hidden transition-all duration-300 select-none animate-in fade-in slide-in-from-bottom-3 ${
                isLogsCollapsed ? 'w-80 h-11' : 'w-[520px] max-w-[calc(100vw-360px)] h-[320px]'
              }`}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-2 bg-zinc-900 border-b border-white/10 shrink-0">
                <div className="flex items-center gap-2.5 truncate">
                  <span className="relative flex h-2 w-2 shrink-0">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
                  </span>
                  <span className="text-xs font-bold text-white tracking-wide truncate">
                    Консоль процесса
                  </span>
                  {launchState.gamePid && (
                    <span className="px-1.5 py-0.2 rounded bg-emerald-500/15 border border-emerald-500/30 text-[9px] font-mono font-bold text-emerald-400 shrink-0">
                      PID: {launchState.gamePid}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  {!isLogsCollapsed && (
                    <>
                      <button
                        type="button"
                        onClick={() => setAutoScroll(!autoScroll)}
                        className={`p-1.5 rounded-lg border transition-colors cursor-pointer press-feedback ${
                          autoScroll
                            ? 'bg-zinc-800 text-emerald-400 border-emerald-400/30'
                            : 'bg-zinc-900 text-zinc-500 border-transparent hover:text-white'
                        }`}
                        title={autoScroll ? 'Автопрокрутка включена' : 'Включить автопрокрутку'}
                      >
                        <ArrowDownCircle size={13} />
                      </button>

                      <button
                        type="button"
                        onClick={handleCopyLogs}
                        disabled={!logs || logs.length === 0}
                        className="p-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white border border-transparent hover:border-white/10 transition-colors cursor-pointer press-feedback disabled:opacity-30"
                        title="Скопировать вывод в буфер обмена"
                      >
                        {copiedLogs ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
                      </button>

                      <button
                        type="button"
                        onClick={onClearLogs}
                        disabled={!logs || logs.length === 0}
                        className="p-1.5 rounded-lg bg-zinc-900 hover:bg-rose-950/50 text-zinc-400 hover:text-rose-400 border border-transparent hover:border-rose-500/20 transition-colors cursor-pointer press-feedback disabled:opacity-30"
                        title="Очистить лог"
                      >
                        <Trash2 size={13} />
                      </button>
                    </>
                  )}

                  <button
                    type="button"
                    onClick={() => setIsLogsCollapsed(!isLogsCollapsed)}
                    className="p-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white border border-transparent hover:border-white/10 transition-colors cursor-pointer press-feedback ml-1"
                    title={isLogsCollapsed ? 'Развернуть консоль' : 'Свернуть консоль'}
                  >
                    {isLogsCollapsed ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                  </button>
                </div>
              </div>

              {/* Live Terminal Stream Output */}
              {!isLogsCollapsed && (
                <div className="flex-1 bg-black p-3 font-mono text-[11px] overflow-y-auto space-y-1 select-text scrollbar-thin">
                  {!logs || logs.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-zinc-600 text-[11px]">
                      <span>Ожидание вывода stdout/stderr игры...</span>
                    </div>
                  ) : (
                    logs.slice(-250).map((log) => (
                      <div
                        key={log.id}
                        className="leading-relaxed hover:bg-white/[0.03] px-1.5 py-0.5 rounded flex items-start gap-2"
                      >
                        <span className="text-zinc-600 shrink-0 select-none text-[10px]">
                          [{log.timestamp}]
                        </span>
                        <span className="text-purple-400/80 shrink-0 font-bold text-[9px] uppercase">
                          [{log.source}]
                        </span>
                        <span className={`break-all ${getLogLevelClass(log.level)}`}>
                          {log.message}
                        </span>
                      </div>
                    ))
                  )}
                  <div ref={logsBottomRef} />
                </div>
              )}
            </div>
          ) : null}

          {/* Action Button: Login / Stop / Play */}
          {!session ? (
            <button
              onClick={onOpenLogin}
              className="px-6 py-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs tracking-wide shadow-md flex items-center gap-2 cursor-pointer press-feedback"
            >
              <User size={15} />
              <span>Войти в аккаунт</span>
            </button>
          ) : isRunning ? (
            <button
              onClick={onKill}
              className="px-6 py-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs tracking-wide shadow-md flex items-center gap-2 cursor-pointer press-feedback"
            >
              <Square size={15} />
              <span>В игре (Остановить)</span>
            </button>
          ) : (
            <button
              onClick={onLaunch}
              disabled={isBusy}
              className="px-7 py-3 rounded-xl bg-white hover:bg-neutral-200 disabled:opacity-50 text-black font-black text-sm tracking-wider shadow-md flex items-center gap-2.5 cursor-pointer press-feedback"
            >
              {isBusy ? (
                <>
                  <RotateCw size={16} className="animate-spin text-black" />
                  <span>СИНХРОНИЗАЦИЯ...</span>
                </>
              ) : (
                <>
                  <Play size={16} className="fill-black text-black" />
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
