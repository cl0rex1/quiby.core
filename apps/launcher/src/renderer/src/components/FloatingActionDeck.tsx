import React from 'react';
import { 
  Play, 
  User, 
  Save, 
  X, 
} from 'lucide-react';
import { AuthSession, LaunchState } from '@quiby/shared';
import { ActiveTab } from './MinimalSidebar';

interface FloatingActionDeckProps {
  activeTab: ActiveTab;
  transitioning?: boolean;
  session: AuthSession | null;
  launchState: LaunchState;
  launchPending?: boolean;
  launchBlocked?: string;
  accessMessage?: string;
  onRetryAccess?: () => void;
  accessChecking?: boolean;
  onLaunch: () => void;
  onOpenLogin: () => void;
  hasUnsavedChanges?: boolean;
  onSave?: () => void | Promise<void>;
  onCancel?: () => void;
}

export const FloatingActionDeck: React.FC<FloatingActionDeckProps> = ({
  activeTab,
  transitioning = false,
  session,
  launchState,
  launchPending = false,
  launchBlocked,
  accessMessage,
  onRetryAccess,
  accessChecking,
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
    if ((isRunning || isBusy) && !transitioning) {
      return null;
    }

    return (
      <div className={`launcher-dock home-launch-dock ${transitioning ? 'is-launching' : ''}`} >
        {/* Right Side: Primary Play Button */}
        <div className="relative flex flex-col items-center gap-3">
          {session && accessMessage && <div className="game-access-notice"><p role="status">{accessMessage}</p><button type="button" className="ui-button" onClick={onRetryAccess} disabled={accessChecking}>{accessChecking ? 'Проверяем…' : 'Проверить доступ'}</button></div>}
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
              disabled={!session.user.isWhitelisted || launchPending || Boolean(launchBlocked)}
              aria-busy={launchPending}
              className="launcher-primary-button flex items-center gap-2.5 cursor-pointer press-feedback"
            >
              <Play size={16} fill="currentColor" />
              <span>{!session.user.isWhitelisted ? 'Доступ закрыт' : launchPending ? 'Подготовка…' : launchBlocked || 'Запустить игру'}</span>
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
