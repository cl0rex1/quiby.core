import React, { useState } from 'react';
import { 
  Home, 
  Layers, 
  Bell, 
  Terminal, 
  Sliders, 
  Play, 
  RotateCw, 
  LogOut, 
  User, 
  MoreHorizontal, 
  Sparkles, 
  CheckCircle2,
  ShieldCheck
} from 'lucide-react';
import { AuthSession, LaunchState } from '@quiby/shared';

export type NavTab = 'play' | 'modpack' | 'news' | 'console' | 'settings';

interface SidebarProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  session: AuthSession | null;
  launchState: LaunchState;
  logsCount: number;
  onLaunch: () => void;
  onOpenLogin: () => void;
  onLogout: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  session,
  launchState,
  logsCount,
  onLaunch,
  onOpenLogin,
  onLogout,
}) => {
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  const navItems: Array<{ id: NavTab; label: string; icon: React.ReactNode; badge?: string | number }> = [
    { id: 'play', label: 'Главная', icon: <Home size={22} strokeWidth={currentTab === 'play' ? 2.5 : 2} /> },
    { id: 'modpack', label: 'Сборка S6', icon: <Layers size={22} strokeWidth={currentTab === 'modpack' ? 2.5 : 2} /> },
    { id: 'news', label: 'Новости', icon: <Bell size={22} strokeWidth={currentTab === 'news' ? 2.5 : 2} />, badge: '6' },
    { id: 'console', label: 'Консоль', icon: <Terminal size={22} strokeWidth={currentTab === 'console' ? 2.5 : 2} />, badge: logsCount > 0 ? logsCount : undefined },
    { id: 'settings', label: 'Настройки', icon: <Sliders size={22} strokeWidth={currentTab === 'settings' ? 2.5 : 2} /> },
  ];

  const isBusy = launchState.status === 'updating' || launchState.status === 'starting';
  const isRunning = launchState.status === 'running';

  return (
    <aside className="w-64 bg-black border-r border-x-border flex flex-col justify-between p-3 select-none shrink-0">
      <div className="space-y-3">
        {/* X-Style Logo */}
        <div className="px-3 py-1 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full hover:bg-white/10 flex items-center justify-center cursor-pointer transition-colors">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-x-purpleDark via-x-purple to-white flex items-center justify-center font-black text-black text-base shadow-purple-subtle">
              Q
            </div>
          </div>
          <div className="flex flex-col">
            <span className="font-extrabold text-base tracking-tight text-white flex items-center gap-1.5">
              quiby<span className="text-x-purpleLight">.</span>
            </span>
            <span className="text-[10px] font-mono text-x-textMuted leading-none">Season 6 Aeronautics</span>
          </div>
        </div>

        {/* Navigation items (X-style rounded-full links) */}
        <nav className="space-y-1">
          {navItems.map((item) => {
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onSelectTab(item.id)}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-full text-base transition-all group ${
                  isActive
                    ? 'font-bold text-white bg-white/10'
                    : 'text-x-text hover:bg-white/10 font-medium'
                }`}
              >
                <div className="flex items-center gap-4">
                  <span className={isActive ? 'text-x-purpleLight' : 'text-x-text group-hover:text-white'}>
                    {item.icon}
                  </span>
                  <span>{item.label}</span>
                </div>

                {item.badge && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-x-purple text-white font-mono font-bold">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Big White / Purple CTA Button (like 'Опубликовать пост') */}
        <div className="pt-2">
          {!session ? (
            <button
              onClick={onOpenLogin}
              className="w-full py-3.5 rounded-full bg-white hover:bg-neutral-200 text-black font-extrabold text-sm tracking-wide shadow-sm hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <User size={18} />
              <span>Войти в аккаунт</span>
            </button>
          ) : isRunning ? (
            <button
              onClick={onLaunch}
              className="w-full py-3.5 rounded-full bg-red-600 hover:bg-red-700 text-white font-extrabold text-sm tracking-wide shadow-sm hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <span className="w-2 h-2 rounded-full bg-white animate-pulse"></span>
              <span>В игре (Остановить)</span>
            </button>
          ) : (
            <button
              onClick={onLaunch}
              disabled={isBusy}
              className="w-full py-3.5 rounded-full bg-gradient-to-r from-x-purple to-x-purpleDark hover:from-x-purpleLight hover:to-x-purple disabled:opacity-50 text-white font-extrabold text-sm tracking-wide shadow-purple-glow hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              {isBusy ? (
                <>
                  <RotateCw size={18} className="animate-spin text-white" />
                  <span>Загрузка...</span>
                </>
              ) : (
                <>
                  <Play size={18} className="fill-white" />
                  <span>ИГРАТЬ (1.21.1)</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Bottom User Profile Section (X style profile pill) */}
      <div className="relative">
        {session ? (
          <>
            {showProfileMenu && (
              <div className="absolute bottom-16 left-0 right-0 bg-x-surface border border-x-border rounded-2xl p-2 shadow-2xl space-y-1 z-50 animate-in fade-in zoom-in-95 duration-150">
                <div className="px-3 py-2 border-b border-x-border/60">
                  <div className="text-xs font-bold text-white flex items-center gap-1.5">
                    <span>{session.user.mcUsername}</span>
                    <ShieldCheck size={13} className="text-x-purpleLight" />
                  </div>
                  <div className="text-[11px] text-x-textMuted truncate">@{session.user.username}</div>
                </div>

                <button
                  onClick={() => {
                    setShowProfileMenu(false);
                    onLogout();
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-red-400 hover:bg-white/10 rounded-xl transition-colors text-left"
                >
                  <LogOut size={14} />
                  <span>Выйти из @{session.user.username}</span>
                </button>
              </div>
            )}

            <button
              onClick={() => setShowProfileMenu(!showProfileMenu)}
              className="w-full flex items-center justify-between p-2 rounded-full hover:bg-white/10 transition-colors text-left group"
            >
              <div className="flex items-center gap-3 truncate">
                <img
                  src={session.user.avatarUrl || `https://api.dicebear.com/8.x/bottts/svg?seed=${session.user.mcUsername}`}
                  alt="Avatar"
                  className="w-10 h-10 rounded-full border border-x-border object-cover shrink-0"
                />
                <div className="flex flex-col truncate">
                  <div className="flex items-center gap-1">
                    <span className="font-bold text-white text-sm truncate">{session.user.mcUsername}</span>
                    <ShieldCheck size={13} className="text-x-purpleLight shrink-0" />
                  </div>
                  <span className="text-xs text-x-textMuted truncate font-mono">@{session.user.username}</span>
                </div>
              </div>
              <MoreHorizontal size={18} className="text-x-textMuted group-hover:text-white shrink-0 mr-1" />
            </button>
          </>
        ) : (
          <div className="p-3 rounded-2xl bg-x-surface border border-x-border text-xs text-x-textMuted flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white shrink-0">
              <User size={16} />
            </div>
            <div className="text-[11px] leading-tight">
              <span className="font-bold text-white block">Гостевой режим</span>
              Авторизуйтесь для вайтлиста
            </div>
          </div>
        )}
      </div>
    </aside>
  );
};
