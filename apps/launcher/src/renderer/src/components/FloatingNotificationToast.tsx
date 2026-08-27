import React, { useEffect } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export interface ToastData {
  id: string;
  title: string;
  message?: string;
  type?: 'success' | 'info' | 'warning' | 'error';
}

interface FloatingNotificationToastProps {
  toast: ToastData | null;
  onDismiss: () => void;
}

export const FloatingNotificationToast: React.FC<FloatingNotificationToastProps> = ({
  toast,
  onDismiss,
}) => {
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => {
      onDismiss();
    }, 5000);
    return () => clearTimeout(timer);
  }, [toast, onDismiss]);

  if (!toast) return null;

  const isSuccess = toast.type === 'success' || !toast.type;
  const isError = toast.type === 'error';

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 pointer-events-auto select-none animate-in slide-in-from-bottom-6 fade-in zoom-in-95 duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]">
      <div className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-zinc-900/95 border border-white/15 backdrop-blur-2xl shadow-[0_12px_40px_rgba(0,0,0,0.85)] max-w-md">
        {/* Status Icon */}
        <div
          className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
            isSuccess
              ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20'
              : isError
              ? 'bg-rose-500/15 text-rose-400 border border-rose-500/20'
              : 'bg-zinc-800 text-zinc-300 border border-white/10'
          }`}
        >
          {isSuccess ? (
            <CheckCircle2 size={18} />
          ) : isError ? (
            <AlertCircle size={18} />
          ) : (
            <Info size={18} />
          )}
        </div>

        {/* Text Details */}
        <div className="flex flex-col truncate pr-1">
          <span className="text-xs font-bold text-white leading-tight truncate">
            {toast.title}
          </span>
          {toast.message && (
            <span className="text-[11px] text-zinc-400 truncate mt-0.5 leading-snug">
              {toast.message}
            </span>
          )}
        </div>

        {/* Dismiss Button */}
        <button
          onClick={onDismiss}
          className="w-6 h-6 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 flex items-center justify-center transition-colors cursor-pointer shrink-0 ml-1"
          title="Закрыть"
        >
          <X size={13} />
        </button>
      </div>
    </div>
  );
};
