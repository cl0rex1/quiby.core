import React, { useState } from 'react';
import { 
  Play, 
  Shirt, 
  FolderGit2, 
  Sliders, 
  LogIn, 
  Bell, 
  ArrowLeft,
  CheckCheck,
  Trash2
} from 'lucide-react';
import { AuthSession } from '@quiby/shared';
import { NotificationItem } from './NotificationsModal';
import quibyLogo from '../assets/quiby_logo.png';
import quibyQLogo from '../assets/quiby_q_logo.png';

export type ActiveTab = 'home' | 'wardrobe' | 'mods' | 'settings';

interface MinimalSidebarProps {
  activeTab: ActiveTab;
  onSelectTab: (tab: ActiveTab) => void;
  session: AuthSession | null;
  onOpenProfile: () => void;
  isNotificationsOpen?: boolean;
  onOpenNotifications?: () => void;
  onCloseNotifications?: () => void;
  notifications?: NotificationItem[];
  selectedNotificationId?: string | null;
  onSelectNotification?: (id: string) => void;
  onMarkAllNotificationsRead?: () => void;
  onClearAllNotifications?: () => void;
  unreadNotificationsCount?: number;
}

export const MinimalSidebar: React.FC<MinimalSidebarProps> = ({
  activeTab,
  onSelectTab,
  session,
  onOpenProfile,
  isNotificationsOpen = false,
  onOpenNotifications,
  onCloseNotifications,
  notifications = [],
  selectedNotificationId,
  onSelectNotification,
  onMarkAllNotificationsRead,
  onClearAllNotifications,
  unreadNotificationsCount = 0,
}) => {
  const [isHovered, setIsHovered] = useState(false);

  const navItems = [
    { id: 'home' as ActiveTab, label: 'Главная', icon: Play, size: 20 },
    { id: 'wardrobe' as ActiveTab, label: 'Гардероб', icon: Shirt, size: 20 },
    { id: 'mods' as ActiveTab, label: 'Моды', icon: FolderGit2, size: 20 },
    { id: 'settings' as ActiveTab, label: 'Настройки', icon: Sliders, size: 20 },
  ];

  const formatShortTime = (ts: number) => {
    const diff = Date.now() - ts;
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return 'Только что';
    if (minutes < 60) return `${minutes}м`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}ч`;
    return new Date(ts).toLocaleDateString('ru-RU', { day: 'numeric', month: 'numeric' });
  };

  return (
    <>
      {/* Full-Window Smooth Backdrop Blur Overlay on Hover (when not in inbox mode) */}
      <div
        className={`fixed inset-0 z-30 bg-black/40 backdrop-blur-md transition-opacity duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] pointer-events-none ${
          isHovered && !isNotificationsOpen ? 'opacity-100' : 'opacity-0'
        }`}
      />

      {/* Interactive Expandable Sidebar Container */}
      <aside
        onMouseEnter={() => !isNotificationsOpen && setIsHovered(true)}
        onMouseLeave={() => !isNotificationsOpen && setIsHovered(false)}
        className={`fixed top-0 left-0 bottom-0 z-40 bg-zinc-950/90 border-r border-white/10 select-none backdrop-blur-2xl transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] shadow-2xl overflow-hidden ${
          isNotificationsOpen
            ? 'w-[310px] shadow-[0_0_60px_rgba(0,0,0,0.9)]'
            : isHovered
            ? 'w-60 shadow-[0_0_50px_rgba(0,0,0,0.85)]'
            : 'w-[72px]'
        }`}
      >
        {/* ========================================================= */}
        {/* 1. STANDARD SIDEBAR RAIL VIEW                             */}
        {/* ========================================================= */}
        <div
          className={`flex flex-col justify-between h-full w-full py-5 px-3 transition-all duration-200 ${
            isNotificationsOpen ? 'opacity-0 pointer-events-none' : 'opacity-100'
          }`}
        >
          {/* Top Brand Mark: Letter 'q' (closed) -> Big Full 'quiby' logo (expanded) with matching neon glow aura */}
          <div className="w-full flex items-center h-14 shrink-0 relative">
            {/* 1. Closed state: Single Letter 'q' logo centered in 48px slot with circular glow */}
            <div
              className={`w-12 h-14 flex items-center justify-center shrink-0 relative transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
                isHovered
                  ? 'opacity-0 scale-75 pointer-events-none -translate-x-4'
                  : 'opacity-100 scale-100 translate-x-0'
              }`}
            >
              {/* Soft purple radial aura */}
              <div className="absolute w-8 h-8 bg-fuchsia-500/35 rounded-full blur-md pointer-events-none" />
              <img
                src={quibyQLogo}
                alt="Q"
                className="w-7 h-9 object-contain drop-shadow-[0_0_12px_rgba(192,38,211,0.9)] drop-shadow-[0_0_24px_rgba(168,85,247,0.5)] hover:scale-105 transition-transform relative z-10"
              />
            </div>

            {/* 2. Expanded state: Big Full 'quiby' logo with wide ambient purple glow bloom */}
            <div
              className={`absolute inset-0 flex items-center justify-center px-2 transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
                isHovered
                  ? 'opacity-100 scale-100 translate-x-0 pointer-events-auto'
                  : 'opacity-0 scale-95 translate-x-4 pointer-events-none'
              }`}
            >
              {/* Wide ambient purple glow aura behind the full wordmark */}
              <div className="absolute inset-x-4 inset-y-2 bg-gradient-to-r from-fuchsia-600/30 via-purple-500/40 to-fuchsia-600/30 rounded-full blur-xl pointer-events-none" />
              <div className="absolute w-28 h-6 bg-fuchsia-400/25 rounded-full blur-md pointer-events-none" />
              <img
                src={quibyLogo}
                alt="Quiby"
                className="w-full h-11 object-contain drop-shadow-[0_0_14px_rgba(192,38,211,0.85)] drop-shadow-[0_0_28px_rgba(168,85,247,0.5)] select-none pointer-events-none relative z-10"
              />
            </div>
          </div>

          {/* Navigation Icons Centered Vertically */}
          <div className="flex flex-col space-y-2.5 w-full my-auto shrink-0">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;

              return (
                <button
                  key={item.id}
                  onClick={() => onSelectTab(item.id)}
                  className={`flex items-center w-full h-12 rounded-2xl cursor-pointer press-feedback ${
                    isActive
                      ? 'bg-zinc-800/90 text-white shadow-sm border border-white/15 border-t-white/30'
                      : 'text-zinc-400 hover:text-white hover:bg-zinc-900/80 border border-transparent'
                  }`}
                  title={!isHovered ? item.label : undefined}
                >
                  {/* 48px fixed icon slot for perfect center alignment */}
                  <div className="w-12 h-12 flex items-center justify-center shrink-0">
                    <Icon
                      size={item.size}
                      strokeWidth={isActive ? 2.5 : 2}
                      className={isActive && item.id === 'home' ? 'fill-white' : ''}
                    />
                  </div>

                  {/* Smooth Animated Label */}
                  <span
                    className={`text-xs font-semibold whitespace-nowrap overflow-hidden transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] pl-1 apple-subheading ${
                      isHovered
                        ? 'max-w-[130px] opacity-100 translate-x-0'
                        : 'max-w-0 opacity-0 -translate-x-3 pointer-events-none'
                    }`}
                  >
                    {item.label}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Bottom Section: Notifications & User Profile */}
          <div className="w-full shrink-0 space-y-2">
            {/* Notifications Bell Button */}
            <button
              onClick={onOpenNotifications}
              className="flex items-center w-full h-12 rounded-2xl cursor-pointer text-zinc-400 hover:text-white hover:bg-zinc-900/80 border border-transparent press-feedback"
              title={!isHovered ? 'Уведомления' : undefined}
            >
              <div className="w-12 h-12 flex items-center justify-center shrink-0 relative">
                <Bell size={19} />
                {unreadNotificationsCount > 0 && (
                  <span className="absolute top-2.5 right-2.5 w-2 h-2 rounded-full bg-blue-500 ring-2 ring-zinc-950 shadow-[0_0_8px_rgba(59,130,246,0.9)] animate-pulse" />
                )}
              </div>
              <div
                className={`flex items-center justify-between whitespace-nowrap overflow-hidden transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] pl-1 flex-1 pr-3 ${
                  isHovered
                    ? 'max-w-[130px] opacity-100 translate-x-0'
                    : 'max-w-0 opacity-0 -translate-x-3 pointer-events-none'
                }`}
              >
                <span className="text-xs font-semibold apple-subheading">Уведомления</span>
                {unreadNotificationsCount > 0 && (
                  <span className="px-1.5 py-0.5 rounded-full bg-blue-500/20 border border-blue-400/30 text-[10px] font-mono text-blue-300">
                    {unreadNotificationsCount}
                  </span>
                )}
              </div>
            </button>

            {/* User Profile / Login */}
            {session ? (
              <button
                onClick={onOpenProfile}
                className="flex items-center w-full h-12 rounded-2xl cursor-pointer hover:bg-zinc-900/80 border border-transparent hover:border-white/5 press-feedback"
                title={!isHovered ? `Профиль: ${session.user.mcUsername}` : undefined}
              >
                <div className="w-12 h-12 flex items-center justify-center shrink-0">
                  <div className="w-9 h-9 rounded-full overflow-hidden border border-white/15 shrink-0 relative shadow-sm">
                    <img
                      src={
                        session.user.avatarUrl ||
                        `https://mc-heads.net/avatar/${session.user.mcUsername}/48`
                      }
                      alt="Avatar"
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>
                <div
                  className={`flex flex-col whitespace-nowrap overflow-hidden transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] pl-1 text-left ${
                    isHovered
                      ? 'max-w-[130px] opacity-100 translate-x-0'
                      : 'max-w-0 opacity-0 -translate-x-3 pointer-events-none'
                  }`}
                >
                  <span className="text-xs font-bold text-white truncate apple-subheading">
                    {session.user.mcUsername}
                  </span>
                  <span className="text-[10px] text-emerald-400 font-mono flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
                    Season VI
                  </span>
                </div>
              </button>
            ) : (
              <button
                onClick={onOpenProfile}
                className="flex items-center w-full h-12 rounded-2xl cursor-pointer text-zinc-400 hover:text-white hover:bg-zinc-900/80 border border-transparent press-feedback"
                title={!isHovered ? 'Войти через Discord' : undefined}
              >
                <div className="w-12 h-12 flex items-center justify-center shrink-0">
                  <LogIn size={20} />
                </div>
                <span
                  className={`text-xs font-semibold whitespace-nowrap overflow-hidden transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] pl-1 apple-subheading ${
                    isHovered
                      ? 'max-w-[130px] opacity-100 translate-x-0'
                      : 'max-w-0 opacity-0 -translate-x-3 pointer-events-none'
                  }`}
                >
                  Войти
                </span>
              </button>
            )}
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 2. MORPHING INBOX DRAWER (Expands up & down directly from the Bell button) */}
        {/* ========================================================================= */}
        <div
          className={`absolute z-30 flex flex-col bg-zinc-950/98 backdrop-blur-2xl transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] overflow-hidden ${
            isNotificationsOpen
              ? 'inset-0 w-[310px] p-4 opacity-100 rounded-none pointer-events-auto'
              : 'left-3 right-3 bottom-[84px] h-12 w-12 opacity-0 rounded-2xl pointer-events-none'
          }`}
        >
          {/* Top Bar: Title & Quick Actions (Clean, NO top back button) */}
          <div className="flex items-center justify-between pb-3 border-b border-white/10 shrink-0">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-xl bg-zinc-900 border border-white/10 flex items-center justify-center text-zinc-300 shadow-sm">
                <Bell size={14} />
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold tracking-wider text-white uppercase apple-micro-tag">
                  Уведомления
                </span>
                {notifications.length > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full bg-zinc-800 border border-white/10 text-[10px] font-mono text-zinc-300">
                    {notifications.length}
                  </span>
                )}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex items-center gap-1">
              {unreadNotificationsCount > 0 && (
                <button
                  onClick={onMarkAllNotificationsRead}
                  className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800/80 transition-colors cursor-pointer press-feedback"
                  title="Прочитать все"
                >
                  <CheckCheck size={14} />
                </button>
              )}
              {notifications.length > 0 && (
                <button
                  onClick={onClearAllNotifications}
                  className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-400 hover:bg-zinc-800/80 transition-colors cursor-pointer press-feedback"
                  title="Очистить все"
                >
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          </div>

          {/* Scrollable Notification Item List */}
          <div className="flex-1 overflow-y-auto space-y-1.5 py-3 pr-1">
            {notifications.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center p-6 text-center text-zinc-500">
                <Bell size={24} className="opacity-30 mb-2" />
                <p className="text-xs font-medium apple-subheading">Нет уведомлений</p>
                <p className="text-[10px] text-zinc-600 mt-0.5 apple-body">Входящие пусты</p>
              </div>
            ) : (
              notifications.map((n) => {
                const isSelected = selectedNotificationId === n.id;
                const isSuccess = n.type === 'success';
                const isError = n.type === 'error';
                const isWarning = n.type === 'warning';

                return (
                  <button
                    key={n.id}
                    onClick={() => onSelectNotification?.(n.id)}
                    className={`w-full p-2.5 rounded-2xl border text-left cursor-pointer relative group flex flex-col gap-1 press-feedback ${
                      isSelected
                        ? 'bg-zinc-800/95 border-white/20 shadow-md text-white border-t-white/30'
                        : n.read
                        ? 'bg-zinc-900/30 hover:bg-zinc-900/80 border-white/5 text-zinc-400 hover:text-zinc-200'
                        : 'bg-zinc-900/70 hover:bg-zinc-800/70 border-white/10 text-zinc-200'
                    }`}
                  >
                    {/* Blue unread dot in Top-Right corner */}
                    {!n.read && (
                      <span className="absolute top-2.5 right-2.5 w-2 h-2 rounded-full bg-blue-500 ring-2 ring-zinc-950 shadow-[0_0_8px_rgba(59,130,246,0.9)]" />
                    )}

                    {/* Top status row */}
                    <div className="flex items-center justify-between gap-1 w-full pr-3">
                      <div className="flex items-center gap-1.5 truncate">
                        <span
                          className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                            isSuccess
                              ? 'bg-emerald-400'
                              : isError
                              ? 'bg-rose-500'
                              : isWarning
                              ? 'bg-amber-400'
                              : 'bg-sky-400'
                          }`}
                        />
                        <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 truncate apple-micro-tag">
                          {isSuccess ? 'Одобрено' : isError ? 'Отклонено' : isWarning ? 'На рассмотрении' : 'Инфо'}
                        </span>
                      </div>
                      <span className="text-[10px] font-mono text-zinc-500 shrink-0">
                        {formatShortTime(n.timestamp)}
                      </span>
                    </div>

                    {/* Title */}
                    <p className="text-xs font-semibold leading-snug line-clamp-2 apple-subheading">
                      {n.title}
                    </p>
                  </button>
                );
              })
            )}
          </div>

          {/* Bottom Back Button */}
          <div className="pt-3 border-t border-white/10 shrink-0">
            <button
              onClick={onCloseNotifications}
              className="w-full h-10 rounded-xl bg-zinc-900/90 hover:bg-zinc-800 border border-white/10 hover:border-white/20 text-xs font-bold text-zinc-200 hover:text-white flex items-center justify-center gap-2 cursor-pointer press-feedback shadow-md group"
            >
              <ArrowLeft size={15} className="group-hover:-translate-x-0.5 transition-transform" />
              <span className="apple-subheading">Назад</span>
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};
