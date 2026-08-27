import React from 'react';
import { Bell, X, Trash2, CheckCircle2, AlertCircle, Info } from 'lucide-react';

export interface NotificationItem {
  id: string;
  title: string;
  message?: string;
  type?: 'success' | 'info' | 'warning' | 'error';
  timestamp: number;
  read: boolean;
}

interface NotificationsModalProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: NotificationItem[];
  onClearAll: () => void;
  onMarkAllRead: () => void;
}

export const NotificationsModal: React.FC<NotificationsModalProps> = ({
  isOpen,
  onClose,
  notifications,
  onClearAll,
}) => {
  if (!isOpen) return null;

  const formatTime = (ts: number) => {
    const diff = Date.now() - ts;
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return 'Только что';
    if (minutes < 60) return `${minutes} мин. назад`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} ч. назад`;
    return new Date(ts).toLocaleDateString('ru-RU');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-200 select-none">
      {/* Backdrop */}
      <div className="absolute inset-0" onClick={onClose} />

      {/* Modal Container */}
      <div 
        className="relative w-full max-w-md rounded-3xl bg-zinc-900 border border-white/10 shadow-2xl p-6 space-y-4 animate-in zoom-in-95 duration-200 z-10 max-h-[85vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/5 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-zinc-800 border border-white/10 flex items-center justify-center text-zinc-300">
              <Bell size={16} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Уведомления</h3>
              <p className="text-[10px] text-zinc-500 font-mono">
                {notifications.length} {notifications.length === 1 ? 'событие' : 'событий'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {notifications.length > 0 && (
              <button
                onClick={onClearAll}
                className="p-1.5 rounded-lg text-zinc-500 hover:text-rose-400 hover:bg-zinc-800 transition-colors cursor-pointer"
                title="Очистить все"
              >
                <Trash2 size={14} />
              </button>
            )}

            <button
              onClick={onClose}
              className="w-8 h-8 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
            >
              <X size={15} />
            </button>
          </div>
        </div>

        {/* Notifications List */}
        <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 min-h-[160px] max-h-[400px]">
          {notifications.length === 0 ? (
            <div className="h-40 flex flex-col items-center justify-center text-center space-y-2 text-zinc-500">
              <Bell size={24} className="stroke-[1.5] opacity-40" />
              <p className="text-xs">Нет новых уведомлений</p>
            </div>
          ) : (
            notifications.map((n) => {
              const isSuccess = n.type === 'success';
              const isError = n.type === 'error';

              return (
                <div
                  key={n.id}
                  className="flex items-start gap-3 p-3 rounded-2xl bg-zinc-950/60 border border-white/5 text-xs transition-colors hover:border-white/10"
                >
                  <div
                    className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                      isSuccess
                        ? 'bg-emerald-500/15 text-emerald-400'
                        : isError
                        ? 'bg-rose-500/15 text-rose-400'
                        : 'bg-zinc-800 text-zinc-400'
                    }`}
                  >
                    {isSuccess ? (
                      <CheckCircle2 size={15} />
                    ) : isError ? (
                      <AlertCircle size={15} />
                    ) : (
                      <Info size={15} />
                    )}
                  </div>

                  <div className="flex-1 space-y-0.5 truncate">
                    <p className="font-bold text-white text-xs leading-tight">
                      {n.title}
                    </p>
                    {n.message && (
                      <p className="text-[11px] text-zinc-400 leading-snug">
                        {n.message}
                      </p>
                    )}
                    <span className="text-[9px] font-mono text-zinc-600 block pt-0.5">
                      {formatTime(n.timestamp)}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
