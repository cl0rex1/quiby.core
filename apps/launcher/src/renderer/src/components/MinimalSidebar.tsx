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
  Trash2,
  CheckCircle2,
  AlertCircle,
  Clock,
  Info
} from 'lucide-react';
import { AuthSession } from '@quiby/shared';
import { NotificationItem } from './NotificationsModal';

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
        className={`fixed inset-0 z-30 bg-black/45 backdrop-blur-md transition-opacity duration-300 ease-out pointer-events-none ${
          isHovered && !isNotificationsOpen ? 'opacity-100' : 'opacity-0'
        }`}
      />

      {/* Interactive Expandable Sidebar / Morphing Email Inbox Drawer */}
      <aside
        onMouseEnter={() => !isNotificationsOpen && setIsHovered(true)}
        onMouseLeave={() => !isNotificationsOpen && setIsHovered(false)}
        className={`fixed top-0 left-0 bottom-0 z-40 flex flex-col justify-between py-5 bg-zinc-950/95 border-r border-white/10 select-none backdrop-blur-2xl transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] shadow-2xl overflow-hidden ${
          isNotificationsOpen
            ? 'w-[310px] px-3.5 shadow-[0_0_60px_rgba(0,0,0,0.9)]'
            : isHovered
            ? 'w-60 px-3 shadow-[0_0_50px_rgba(0,0,0,0.85)]'
            : 'w-[72px] px-3'
        }`}
      >
        {/* ========================================================= */}
        {/* CASE 1: MORPHED EMAIL-LIKE NOTIFICATION INBOX SIDEBAR     */}
        {/* ========================================================= */}
        {isNotificationsOpen ? (
          <div className="flex flex-col h-full w-full animate-in fade-in slide-in-from-left-4 duration-300">
            {/* Morph Top Bar with Back Button */}
            <div className="flex items-center justify-between pb-3 border-b border-white/10 shrink-0">
              <div className="flex items-center gap-2">
                <button
                  onClick={onCloseNotifications}
                  className="w-8 h-8 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-white/10 text-zinc-300 hover:text-white flex items-center justify-center transition-all cursor-pointer active:scale-95 shadow-sm"
                  title="Назад"
                >
                  <ArrowLeft size={16} />
                </button>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-black tracking-wide text-white uppercase">
                    Входящие
                  </span>
                  {notifications.length > 0 && (
                    <span className="px-1.5 py-0.2 rounded-full bg-zinc-800 border border-white/10 text-[10px] font-mono text-zinc-400">
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
                    className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
                    title="Прочитать все"
                  >
                    <CheckCheck size={14} />
                  </button>
                )}
                {notifications.length > 0 && (
                  <button
                    onClick={onClearAllNotifications}
                    className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-400 hover:bg-zinc-800 transition-colors cursor-pointer"
                    title="Очистить все"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            </div>

            {/* Scrollable Notification Item List (Email style) */}
            <div className="flex-1 overflow-y-auto space-y-1.5 py-3 pr-1">
              {notifications.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center p-6 text-center text-zinc-500">
                  <Bell size={24} className="opacity-30 mb-2" />
                  <p className="text-xs font-medium">Нет уведомлений</p>
                  <p className="text-[10px] text-zinc-600 mt-0.5">Входящие пусты</p>
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
                      className={`w-full p-2.5 rounded-xl border text-left transition-all cursor-pointer relative group flex flex-col gap-1 ${
                        isSelected
                          ? 'bg-zinc-800 border-white/20 shadow-md text-white'
                          : n.read
                          ? 'bg-zinc-900/30 hover:bg-zinc-900/80 border-white/5 text-zinc-400 hover:text-zinc-200'
                          : 'bg-zinc-900/80 hover:bg-zinc-800/80 border-white/10 text-zinc-200'
                      }`}
                    >
                      {/* Top status row */}
                      <div className="flex items-center justify-between gap-1 w-full">
                        <div className="flex items-center gap-1.5 truncate">
                          {/* Unread indicator */}
                          {!n.read && (
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                          )}
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
                          <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 truncate">
                            {isSuccess ? 'Одобрено' : isError ? 'Отклонено' : isWarning ? 'На рассмотрении' : 'Инфо'}
                          </span>
                        </div>
                        <span className="text-[10px] font-mono text-zinc-500 shrink-0">
                          {formatShortTime(n.timestamp)}
                        </span>
                      </div>

                      {/* Title */}
                      <p className="text-xs font-semibold leading-snug line-clamp-2">
                        {n.title}
                      </p>
                    </button>
                  );
                })
              )}
            </div>

            {/* Bottom Back Shortcut Bar */}
            <div className="pt-2 border-t border-white/10 shrink-0">
              <button
                onClick={onCloseNotifications}
                className="w-full h-9 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-xs font-semibold text-zinc-300 hover:text-white flex items-center justify-center gap-1.5 transition-all cursor-pointer active:scale-95"
              >
                <ArrowLeft size={14} />
                <span>Вернуться назад</span>
              </button>
            </div>
          </div>
        ) : (
          /* ========================================================= */
          /* CASE 2: STANDARD COMPACT RAIL / HOVER EXPANDED SIDEBAR    */
          /* ========================================================= */
          <>
            {/* Top Brand Mark (48px wide anchor for exact 36px center) */}
            <div className="w-full flex items-center h-12 shrink-0">
              <div className="w-12 h-12 flex items-center justify-center shrink-0">
                <div className="w-8 h-8 rounded-xl bg-white flex items-center justify-center text-black font-black text-xs shadow-sm">
                  Q
                </div>
              </div>
              <div
                className={`flex flex-col whitespace-nowrap overflow-hidden transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] pl-2 ${
                  isHovered
                    ? 'max-w-[140px] opacity-100 translate-x-0'
                    : 'max-w-0 opacity-0 -translate-x-3 pointer-events-none'
                }`}
              >
                <span className="text-xs font-black tracking-wider text-white">QUIBY.CORE</span>
                <span className="text-[10px] text-zinc-500 font-mono">SEASON VI</span>
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
                    className={`flex items-center w-full h-12 rounded-2xl transition-all duration-200 cursor-pointer ${
                      isActive
                        ? 'bg-zinc-800 text-white shadow-sm border border-white/10'
                        : 'text-zinc-400 hover:text-white hover:bg-zinc-900 border border-transparent'
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

                    {/* Smooth Animated Label without Layout Shift */}
                    <span
                      className={`text-xs font-semibold whitespace-nowrap overflow-hidden transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] pl-1 ${
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
              {/* Notifications Button above Avatar */}
              <button
                onClick={onOpenNotifications}
                className="flex items-center w-full h-12 rounded-2xl transition-all duration-200 cursor-pointer text-zinc-400 hover:text-white hover:bg-zinc-900 border border-transparent"
                title={!isHovered ? 'Уведомления' : undefined}
              >
                <div className="w-12 h-12 flex items-center justify-center shrink-0 relative">
                  <Bell size={19} />
                  {unreadNotificationsCount > 0 && (
                    <span className="absolute top-3 right-3 w-2 h-2 rounded-full bg-emerald-400 ring-2 ring-zinc-950 animate-pulse" />
                  )}
                </div>
                <div
                  className={`flex items-center justify-between whitespace-nowrap overflow-hidden transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] pl-1 flex-1 pr-3 ${
                    isHovered
                      ? 'max-w-[130px] opacity-100 translate-x-0'
                      : 'max-w-0 opacity-0 -translate-x-3 pointer-events-none'
                  }`}
                >
                  <span className="text-xs font-semibold">Уведомления</span>
                  {unreadNotificationsCount > 0 && (
                    <span className="px-1.5 py-0.5 rounded-full bg-zinc-800 border border-white/10 text-[10px] font-mono text-emerald-400">
                      {unreadNotificationsCount}
                    </span>
                  )}
                </div>
              </button>

              {/* User Profile / Login */}
              {session ? (
                <button
                  onClick={onOpenProfile}
                  className="flex items-center w-full h-12 rounded-2xl transition-all duration-200 cursor-pointer hover:bg-zinc-900 border border-transparent hover:border-white/5"
                  title={!isHovered ? `Профиль: ${session.user.mcUsername}` : undefined}
                >
                  {/* 48px fixed avatar slot */}
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
                    <span className="text-xs font-bold text-white truncate">
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
                  className="flex items-center w-full h-12 rounded-2xl transition-all duration-200 cursor-pointer text-zinc-400 hover:text-white hover:bg-zinc-900 border border-transparent"
                  title={!isHovered ? 'Войти через Discord' : undefined}
                >
                  <div className="w-12 h-12 flex items-center justify-center shrink-0">
                    <LogIn size={20} />
                  </div>
                  <span
                    className={`text-xs font-semibold whitespace-nowrap overflow-hidden transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] pl-1 ${
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
          </>
        )}
      </aside>
    </>
  );
};
