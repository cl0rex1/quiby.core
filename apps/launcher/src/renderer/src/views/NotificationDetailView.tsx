import React from 'react';
import { 
  CheckCircle2, 
  AlertCircle, 
  Info, 
  Bell, 
  Trash2, 
  FolderGit2, 
  ShieldCheck,
  Clock,
  FileCode,
  Hash
} from 'lucide-react';
import { NotificationItem } from '../components/NotificationsModal';

interface NotificationDetailViewProps {
  notification: NotificationItem | null;
  onDeleteNotification: (id: string) => void;
  onNavigateToMods: () => void;
}

export const NotificationDetailView: React.FC<NotificationDetailViewProps> = ({
  notification,
  onDeleteNotification,
  onNavigateToMods,
}) => {
  if (!notification) {
    return (
      <div className="flex-1 h-full flex flex-col items-center justify-center p-8 text-center select-none animate-in fade-in duration-300">
        <div className="w-16 h-16 rounded-3xl glass-panel flex items-center justify-center text-zinc-500 mb-4 shadow-xl">
          <Bell size={28} />
        </div>
        <h3 className="text-base font-bold text-white mb-1 apple-subheading">Нет выбранного уведомления</h3>
        <p className="text-xs text-zinc-500 max-w-sm apple-body">
          Выберите входящее сообщение из списка слева для подробного просмотра деталей
        </p>
      </div>
    );
  }

  const type = notification.type || 'info';
  const isSuccess = type === 'success';
  const isError = type === 'error';
  const isWarning = type === 'warning';

  const formatFullTime = (ts: number) => {
    return new Date(ts).toLocaleString('ru-RU', {
      day: 'numeric',
      month: 'long',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="flex-1 h-full flex flex-col overflow-y-auto p-8 max-w-4xl select-none animate-in fade-in slide-in-from-right-4 duration-300">
      {/* Header Bar with Apple Typography */}
      <div className="flex items-center justify-between pb-6 border-b border-white/10 shrink-0">
        <div className="flex items-center gap-3.5">
          <div
            className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 border shadow-sm ${
              isSuccess
                ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
                : isError
                ? 'bg-rose-500/15 border-rose-500/30 text-rose-400'
                : isWarning
                ? 'bg-amber-500/15 border-amber-500/30 text-amber-400'
                : 'bg-sky-500/15 border-sky-500/30 text-sky-400'
            }`}
          >
            {isSuccess ? (
              <CheckCircle2 size={22} />
            ) : isError ? (
              <AlertCircle size={22} />
            ) : isWarning ? (
              <Clock size={22} />
            ) : (
              <Info size={22} />
            )}
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span
                className={`text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md apple-micro-tag ${
                  isSuccess
                    ? 'bg-emerald-500/20 text-emerald-300'
                    : isError
                    ? 'bg-rose-500/20 text-rose-300'
                    : isWarning
                    ? 'bg-amber-500/20 text-amber-300'
                    : 'bg-sky-500/20 text-sky-300'
                }`}
              >
                {isSuccess ? 'Одобрено' : isError ? 'Отклонено' : isWarning ? 'На рассмотрении' : 'Система'}
              </span>
              <span className="text-xs text-zinc-400 font-mono flex items-center gap-1">
                <Clock size={12} />
                {formatFullTime(notification.timestamp)}
              </span>
            </div>
            <h1 className="text-lg font-bold text-white mt-1 apple-heading">
              {notification.title}
            </h1>
          </div>
        </div>

        {/* Action Toolbar */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => onDeleteNotification(notification.id)}
            className="h-9 px-3 rounded-xl bg-zinc-900/90 hover:bg-rose-950/60 border border-white/10 hover:border-rose-500/40 text-xs font-semibold text-zinc-300 hover:text-rose-300 transition-all flex items-center gap-1.5 cursor-pointer press-feedback shadow-sm"
            title="Удалить уведомление"
          >
            <Trash2 size={14} />
            <span className="apple-subheading">Удалить</span>
          </button>
        </div>
      </div>

      {/* Main Content Body */}
      <div className="py-6 space-y-5 flex-1">
        {/* Mod Specific Meta Card if available */}
        {notification.modInfo ? (
          <div className="p-5 rounded-3xl glass-panel space-y-4">
            <div className="flex items-center gap-4">
              {notification.modInfo.iconUrl ? (
                <img
                  src={notification.modInfo.iconUrl}
                  alt={notification.modInfo.name || 'Mod'}
                  className="w-14 h-14 rounded-2xl object-cover border border-white/10 shadow-md shrink-0 bg-zinc-800"
                />
              ) : (
                <div className="w-14 h-14 rounded-2xl bg-zinc-800/80 border border-white/10 flex items-center justify-center text-zinc-400 shrink-0">
                  <FileCode size={24} />
                </div>
              )}

              <div className="space-y-1 truncate">
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-bold text-white truncate apple-subheading">
                    {notification.modInfo.name || 'Кастомный мод'}
                  </h2>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-zinc-800/80 border border-white/10 text-zinc-400">
                    {notification.modInfo.filename}
                  </span>
                </div>
                <p className="text-xs text-zinc-400 leading-relaxed apple-body">
                  {notification.modInfo.description || 'Мод добавлен в клиентскую сборку Quiby.'}
                </p>
              </div>
            </div>

            {/* Technical Verification Details */}
            <div className="grid grid-cols-2 gap-3 pt-3 border-t border-white/5 font-mono text-[11px]">
              <div className="p-2.5 rounded-xl bg-zinc-950/60 border border-white/5 flex items-center gap-2 text-zinc-300">
                <ShieldCheck size={14} className="text-emerald-400 shrink-0" />
                <span className="truncate">Антивирус: чисто (0 угроз)</span>
              </div>
              {notification.modInfo.hashSha1 && (
                <div className="p-2.5 rounded-xl bg-zinc-950/60 border border-white/5 flex items-center gap-2 text-zinc-300 truncate">
                  <Hash size={14} className="text-sky-400 shrink-0" />
                  <span className="truncate">SHA-1: {notification.modInfo.hashSha1.substring(0, 16)}...</span>
                </div>
              )}
            </div>
          </div>
        ) : null}

        {/* Message Paragraph */}
        {notification.message && (
          <div className="p-5 rounded-2xl glass-card">
            <p className="text-sm text-zinc-200 leading-relaxed whitespace-pre-wrap apple-body">
              {notification.message}
            </p>
          </div>
        )}

        {/* Informational Guidance Box */}
        <div className="p-4 rounded-2xl glass-card flex items-start gap-3">
          <Info size={16} className="text-zinc-400 shrink-0 mt-0.5" />
          <div className="text-xs text-zinc-400 leading-relaxed apple-body">
            Модерация клиентских модов происходит через защищенный канал Discord. Ответ по вайтлисту синхронизируется с лаунчером в реальном времени.
          </div>
        </div>
      </div>

      {/* Bottom Navigation Shortcut */}
      <div className="pt-4 border-t border-white/10 shrink-0 flex items-center justify-end">
        <button
          onClick={onNavigateToMods}
          className="h-10 px-5 rounded-xl bg-white hover:bg-neutral-100 text-zinc-950 font-bold text-xs transition-all flex items-center gap-2 cursor-pointer press-feedback shadow-md border border-white/40"
        >
          <FolderGit2 size={15} />
          <span className="apple-subheading">Перейти во вкладку «Моды»</span>
        </button>
      </div>
    </div>
  );
};
