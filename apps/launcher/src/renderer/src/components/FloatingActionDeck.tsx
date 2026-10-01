import React from 'react';
import { 
  Play, 
  User, 
  Save, 
  X, 
  Check, 
} from 'lucide-react';
import { AuthSession, DownloadProgress, LaunchState, LogEntry, ServerStatus } from '@quiby/shared';
import { ActiveTab } from './MinimalSidebar';

interface FloatingActionDeckProps {
  activeTab: ActiveTab;
  session: AuthSession | null;
  serverStatus: ServerStatus | null;
  hasServerAddress: boolean;
  launchState: LaunchState;
  downloadProgress: DownloadProgress | null;
  logs?: LogEntry[];
  onClearLogs?: () => void;
  autoConnect?: boolean;
  onToggleAutoConnect?: (val: boolean) => void;
  onLaunch: () => void;
  onKill: () => void;
  onOpenLogin: () => void;
  hasUnsavedChanges?: boolean;
  onSave?: () => void | Promise<void>;
  onCancel?: () => void;
}

export const FloatingActionDeck: React.FC<FloatingActionDeckProps> = ({
  activeTab,
  session,
  serverStatus,
  hasServerAddress,
  launchState,
  autoConnect = true,
  onToggleAutoConnect,
  onLaunch,
  onOpenLogin,
  hasUnsavedChanges = false,
  onSave,
  onCancel,
}) => {
  const isBusy = launchState.status === 'updating' || launchState.status === 'starting';
  const isRunning = launchState.status === 'running';
  // Case 1: On Home Tab -> Keep Play Button, InGameLaunchStage handles active running controls
  if (activeTab === 'home') {
    if (isRunning || isBusy) {
      return null;
    }

    return (
      <div className="launcher-dock fixed bottom-0 left-44 right-0 h-20 border-t px-6 sm:px-8 flex items-center justify-between z-30 select-none surface-dock">
        {/* Left Side: Server Status & Quick Ping */}
        <div className="flex items-center gap-3">
          <span className={serverStatus?.online ? 'status-dot is-online' : 'status-dot'} />
          <span className="dock-address">QUIBY / СЕРВЕР</span>
          <span className="dock-status">{serverStatus?.online ? 'Сервер доступен' : !hasServerAddress ? 'Сервер готовится' : serverStatus ? 'Сервер выключен' : 'Нет данных'}</span>
        </div>

        {/* Center / Controls: Fast-Connect Toggle */}
        <div className="flex items-center gap-3">
          {session && hasServerAddress && (
            <button
              type="button"
              onClick={() => onToggleAutoConnect?.(!autoConnect)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-colors cursor-pointer press-feedback text-xs font-semibold select-none ${
                autoConnect
                  ? 'bg-surface-850 border-[#bb74ff]/40 text-[#d7b6ff]'
                  : 'bg-surface-900 border-surface-border text-zinc-400 hover:text-zinc-200'
              }`}
              title="Автоматический вход сразу на сервер без перехода в главное меню"
            >
              <div
                className={`w-3.5 h-3.5 rounded flex items-center justify-center border transition-all ${
                  autoConnect
                    ? 'bg-[#bb74ff] border-[#bb74ff] text-[#0c0c0d]'
                    : 'border-zinc-600 bg-surface-800'
                }`}
              >
                {autoConnect && <Check size={10} className="stroke-[3.5]" />}
              </div>
              <span>Сразу на сервер</span>
            </button>
          )}
        </div>

        {/* Right Side: Primary Play Button */}
        <div className="relative flex items-center gap-3">
          {!session ? (
            <button
              type="button"
              onClick={onOpenLogin}
              className="launcher-primary-button flex items-center gap-2 cursor-pointer press-feedback"
            >
              <User size={15} />
              <span>Войти в аккаунт</span>
            </button>
          ) : (
            /* Clean, powerful high-contrast «ИГРАТЬ» button in sharp brass */
            <button
              type="button"
              onClick={onLaunch}
              disabled={!session.user.isWhitelisted}
              className="launcher-primary-button flex items-center gap-2.5 cursor-pointer press-feedback"
            >
              <Play size={16} fill="currentColor" />
              <span>{session.user.isWhitelisted ? 'Запустить игру' : 'Доступ закрыт'}</span>
            </button>
          )}
        </div>
      </div>
    );
  }

  // Case 2: Other Tabs -> Solid Dock for Batch Actions & Save (if applicable)
  return (
    <>
      {/* 2. OPTIONAL SAVE DOCK: Clean, immediate save without delays or animations */}
      {hasUnsavedChanges && (
        <div className="fixed bottom-8 right-8 z-40 select-none pointer-events-auto transition-all duration-200 ease-out">
          <div className="flex items-center gap-2 p-1.5 rounded-full bg-surface-900 border border-surface-border shadow-2xl">
            {onCancel && (
              <button
                type="button"
                onClick={onCancel}
                className="w-9 h-9 rounded-full bg-surface-800 hover:bg-surface-750 text-zinc-400 hover:text-white flex items-center justify-center press-feedback shrink-0 shadow-sm transition-colors"
                title="Отменить"
              >
                <X size={15} />
              </button>
            )}
            {onSave && (
              <button
                type="button"
                onClick={() => onSave()}
                className="px-5 py-2 rounded-full bg-[#bb74ff] hover:bg-[#d7b6ff] text-[#0c0c0d] text-xs font-black shadow-sm flex items-center gap-1.5 cursor-pointer press-feedback transition-colors shrink-0"
              >
                <Save size={13} />
                <span>Сохранить</span>
              </button>
            )}
          </div>
        </div>
      )}
    </>
  );
};
