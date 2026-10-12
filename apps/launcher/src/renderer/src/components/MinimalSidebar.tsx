import React from 'react';
import { DiscordAvatar } from './DiscordAvatar';
import { 
  Play, 
  Shirt, 
  Layers, 
  Sliders, 
  LogIn, 
  Mail, 
  ArrowLeft,
  CheckCheck,
  Trash2,
  PanelLeftClose,
  PanelLeftOpen
} from 'lucide-react';
import { AuthSession } from '@quiby/shared';
import type { NotificationItem } from '../utils/notifications';
import quibyLogo from '../assets/quiby_logo.png';
import quibyQLogo from '../assets/quiby_q_logo.png';

export type ActiveTab = 'home' | 'wardrobe' | 'mods' | 'settings';

interface MinimalSidebarProps {
  collapsed: boolean;
  onToggleCollapsed: () => void;
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
  collapsed,
  onToggleCollapsed,
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
  const expanded = !collapsed;

  const navItems = [
    { id: 'home' as ActiveTab, label: 'Главная', icon: Play, size: 19 },
    { id: 'wardrobe' as ActiveTab, label: 'Гардероб', icon: Shirt, size: 19 },
    { id: 'mods' as ActiveTab, label: 'Контент', icon: Layers, size: 19 },
    { id: 'settings' as ActiveTab, label: 'Настройки', icon: Sliders, size: 19 },
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
    <aside
      className={`launcher-sidebar fixed top-8 left-0 bottom-0 z-40 bg-[#141415] border-r border-[#2c2c30] select-none overflow-hidden ${collapsed ? 'is-collapsed' : ''}`}
    >
      {/* ========================================================= */}
      {/* 1. STANDARD SIDEBAR RAIL VIEW                             */}
      {/* ========================================================= */}
      <div
        aria-hidden={isNotificationsOpen}
        className={`flex flex-col justify-between h-full w-full py-4 px-2.5 transition-all duration-200 ${
          isNotificationsOpen ? 'invisible opacity-0 pointer-events-none' : 'visible opacity-100'
        }`}
      >
        {/* Top Brand Mark: Letter 'q' (closed) -> Clean Full 'quiby' logo (expanded) */}
        <div className="sidebar-brand w-full flex items-center h-12 shrink-0 relative">
          {/* 1. Closed state: Single Letter 'q' logo centered */}
          <div
            className={`w-12 h-12 flex items-center justify-center shrink-0 relative transition-all duration-200 ease-out ${
              expanded
                ? 'opacity-0 scale-75 pointer-events-none -translate-x-4'
                : 'opacity-100 scale-100 translate-x-0'
            }`}
          >
            <img
              src={quibyQLogo}
              alt="Q"
              className="w-7 h-9 object-contain relative z-10"
            />
          </div>

          {/* 2. Expanded state: Clean Full 'quiby' wordmark */}
          <div
            className={`absolute inset-0 flex items-center justify-center px-3 transition-all duration-200 ease-out ${
              expanded
                ? 'opacity-100 scale-100 translate-x-0 pointer-events-auto'
                : 'opacity-0 scale-95 translate-x-4 pointer-events-none'
            }`}
          >
            <img
              src={quibyLogo}
              alt="Quiby"
              className="w-full h-9 object-contain select-none pointer-events-none relative z-10"
            />
          </div>
        </div>

        <button
          type="button"
          onClick={onToggleCollapsed}
          className="sidebar-collapse flex items-center w-full h-11 mt-3 rounded-xl cursor-pointer press-feedback text-zinc-400 hover:text-white hover:bg-surface-850 transition-colors shrink-0"
          aria-expanded={!collapsed}
          aria-controls="launcher-navigation"
          aria-label={collapsed ? 'Развернуть меню' : 'Свернуть меню'}
          title={collapsed ? 'Развернуть меню' : undefined}
        >
          <span className="w-12 h-11 flex items-center justify-center shrink-0">
            {collapsed ? <PanelLeftOpen size={19} /> : <PanelLeftClose size={19} />}
          </span>
          <span
            className={`sidebar-label text-xs font-medium whitespace-nowrap overflow-hidden transition-all duration-200 ease-out pl-1 ${
              expanded
                ? 'max-w-[130px] opacity-100 translate-x-0'
                : 'max-w-0 opacity-0 -translate-x-3 pointer-events-none'
            }`}
          >
            {collapsed ? 'Развернуть' : 'Свернуть'}
          </span>
        </button>

        {/* Navigation Icons Centered Vertically */}
        <nav id="launcher-navigation" aria-label="Разделы лаунчера" className="flex flex-col space-y-1.5 w-full my-auto shrink-0">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectTab(item.id)}
                className={`flex items-center w-full h-11 rounded-xl cursor-pointer press-feedback relative transition-colors ${
                  isActive
                    ? 'bg-surface-800 text-white font-semibold'
                    : 'text-zinc-400 hover:text-white hover:bg-surface-850'
                }`}
                aria-label={item.label}
                aria-current={isActive ? "page" : undefined}
                title={!expanded ? item.label : undefined}
              >
                {/* Sleek vertical active indicator bar (brass accent) */}
                {isActive && (
                  <div className="absolute left-0 top-1.5 bottom-1.5 w-1 rounded-r bg-[#bb74ff]" />
                )}

                {/* Fixed icon slot for perfect center alignment */}
                <div className="w-12 h-11 flex items-center justify-center shrink-0">
                  <Icon
                    size={item.size}
                    strokeWidth={isActive ? 2.5 : 2}
                    className={isActive ? 'text-[#bb74ff]' : ''}
                  />
                </div>

                {/* Smooth Animated Label */}
                <span
                  className={`sidebar-label text-xs font-medium whitespace-nowrap overflow-hidden transition-all duration-200 ease-out pl-1 ${
                    expanded
                      ? 'max-w-[130px] opacity-100 translate-x-0'
                      : 'max-w-0 opacity-0 -translate-x-3 pointer-events-none'
                  }`}
                >
                  {item.label}
                </span>
              </button>
            );
          })}
        </nav>

        {/* Bottom Section: Mail & User Profile */}
        <div className="w-full shrink-0 space-y-1.5">
          {/* Mail Button */}
          <button
            type="button"
            onClick={onOpenNotifications}
            aria-label={unreadNotificationsCount ? `Почта, непрочитанных: ${unreadNotificationsCount}` : 'Почта'}
            className="flex items-center w-full h-11 rounded-xl cursor-pointer text-zinc-400 hover:text-white hover:bg-surface-850 transition-colors press-feedback relative"
            title={!expanded ? 'Почта' : undefined}
          >
            <div className="w-12 h-11 flex items-center justify-center shrink-0 relative">
              <Mail size={18} />
              {unreadNotificationsCount > 0 && (
                <span className="absolute top-2.5 right-3 w-2 h-2 rounded-full bg-[#bb74ff] ring-2 ring-[#141415]" />
              )}
            </div>
            <div
              className={`flex items-center justify-between whitespace-nowrap overflow-hidden transition-all duration-200 ease-out pl-1 flex-1 pr-3 ${
                expanded
                  ? 'max-w-[130px] opacity-100 translate-x-0'
                  : 'max-w-0 opacity-0 -translate-x-3 pointer-events-none'
              }`}
            >
              <span className="sidebar-label text-xs font-medium">Почта</span>
              {unreadNotificationsCount > 0 && (
                <span className="px-1.5 py-0.5 rounded-full bg-[#bb74ff]/20 border border-[#bb74ff]/30 text-[10px] font-mono text-[#d7b6ff]">
                  {unreadNotificationsCount}
                </span>
              )}
            </div>
          </button>

          {/* User Profile / Login */}
          {session ? (
            <button
              type="button"
              onClick={onOpenProfile}
              aria-label={`Профиль: ${session.user.mcUsername}`}
              className="flex items-center w-full h-11 rounded-xl cursor-pointer hover:bg-surface-850 transition-colors press-feedback"
              title={!expanded ? `Профиль: ${session.user.mcUsername}` : undefined}
            >
              <div className="w-12 h-11 flex items-center justify-center shrink-0">
                <div className="w-8 h-8 rounded-full overflow-hidden border border-surface-border shrink-0 relative shadow-sm">
                  <DiscordAvatar user={session.user} className="w-full h-full object-cover" />
                </div>
              </div>
              <div
                className={`flex flex-col whitespace-nowrap overflow-hidden transition-all duration-200 ease-out pl-1 text-left ${
                  expanded
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
              type="button"
              onClick={onOpenProfile}
              className="flex items-center w-full h-11 rounded-xl cursor-pointer text-zinc-400 hover:text-white hover:bg-surface-850 transition-colors press-feedback"
              title={!expanded ? 'Войти через Discord' : undefined}
            >
              <div className="w-12 h-11 flex items-center justify-center shrink-0">
                <LogIn size={18} />
              </div>
              <span
                className={`sidebar-label text-xs font-medium whitespace-nowrap overflow-hidden transition-all duration-200 ease-out pl-1 ${
                  expanded
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
      {/* 2. SOLID INBOX DRAWER                                                     */}
      {/* ========================================================================= */}
      <div
        aria-hidden={!isNotificationsOpen}
        className={`inbox-drawer absolute inset-0 z-30 flex flex-col bg-[#141415] p-4 transition-all duration-200 ease-out overflow-hidden ${
          isNotificationsOpen
            ? 'visible opacity-100 translate-x-0 pointer-events-auto'
            : 'invisible opacity-0 -translate-x-6 pointer-events-none'
        }`}
      >
        {/* Top Bar: Title & Quick Actions */}
        <div className="flex items-center justify-between pb-3 border-b border-[#2c2c30] shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-surface-800 border border-surface-border flex items-center justify-center text-[#bb74ff] shadow-sm">
              <Mail size={13} />
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold tracking-wider text-white uppercase">
                Почта
              </span>
              {notifications.length > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-surface-850 border border-surface-border text-[10px] font-mono text-zinc-300">
                  {notifications.length}
                </span>
              )}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-1">
            {unreadNotificationsCount > 0 && (
              <button
                type="button"
                onClick={onMarkAllNotificationsRead}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-surface-800 transition-colors cursor-pointer press-feedback"
                title="Прочитать все"
              >
                <CheckCheck size={14} />
              </button>
            )}
            {notifications.length > 0 && (
              <button
                type="button"
                onClick={onClearAllNotifications}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-400 hover:bg-surface-800 transition-colors cursor-pointer press-feedback"
                title="Очистить все"
              >
                <Trash2 size={14} />
              </button>
            )}
          </div>
        </div>

        {/* Scrollable Notification Item List */}
        <div className="inbox-list" role="list" aria-label="Письма">
          {notifications.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center p-6 text-center text-zinc-500">
              <Mail size={24} className="opacity-30 mb-2 text-[#bb74ff]" />
              <p className="text-xs font-medium text-zinc-300">Нет писем и уведомлений</p>
              <p className="text-[10px] text-zinc-500 mt-0.5">Почтовый ящик пуст</p>
            </div>
          ) : (
            notifications.map((n) => {
              const isSelected = selectedNotificationId === n.id;
              return <div role="listitem" key={n.id}>
                <button type="button" onClick={() => onSelectNotification?.(n.id)} aria-current={isSelected ? 'true' : undefined}
                  className={`inbox-letter is-${n.type} ${n.read ? '' : 'is-unread'}`}>
                  <span className="inbox-letter-meta"><span className="inbox-letter-status">{n.modInfo ? (n.type === 'success' ? 'Одобрено' : n.type === 'error' ? 'Отклонено' : 'Заявка') : (n.type === 'error' ? 'Ошибка' : n.type === 'warning' ? 'Внимание' : n.type === 'success' ? 'Готово' : 'Инфо')}</span>
                    <time dateTime={new Date(n.timestamp).toISOString()}>{formatShortTime(n.timestamp)}</time></span>
                  <strong>{n.title}</strong>
                  {n.message && <span className="inbox-letter-preview">{n.message}</span>}
                  {!n.read && <span className="inbox-unread-dot" aria-label="Не прочитано"/>}
                </button>
              </div>;
            })
          )}
        </div>

        {/* Bottom Back Button */}
        <div className="pt-3 border-t border-[#2c2c30] shrink-0">
          <button
            type="button"
            onClick={onCloseNotifications}
            className="w-full h-10 rounded-xl bg-surface-850 hover:bg-surface-800 border border-surface-border hover:border-surface-borderLight text-xs font-bold text-zinc-200 hover:text-white flex items-center justify-center gap-2 cursor-pointer press-feedback transition-colors group"
          >
            <ArrowLeft size={15} className="group-hover:-translate-x-0.5 transition-transform" />
            <span>Назад</span>
          </button>
        </div>
      </div>
    </aside>
  );
};
