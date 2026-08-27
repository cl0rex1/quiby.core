import React, { useState, useEffect } from 'react';
import { 
  X, 
  Send, 
  Loader2, 
  CheckCircle2, 
  ShieldCheck, 
  FileCode, 
  Link, 
  AlertCircle,
  Hash
} from 'lucide-react';
import { AuthSession } from '@quiby/shared';
import { CustomModItem } from '../views/ModsView';
import { submitModWhitelistRequest } from '../utils/modVerifier';

interface ModWhitelistModalProps {
  isOpen: boolean;
  onClose: () => void;
  mod: CustomModItem | null;
  session?: AuthSession | null;
  serverUrl?: string;
  onSuccess: (modId: string) => void;
}

export const ModWhitelistModal: React.FC<ModWhitelistModalProps> = ({
  isOpen,
  onClose,
  mod,
  session,
  serverUrl = 'http://localhost:3001',
  onSuccess,
}) => {
  const [mcUsername, setMcUsername] = useState('');
  const [reason, setReason] = useState('');
  const [projectUrl, setProjectUrl] = useState('');
  const [agreed, setAgreed] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);

  useEffect(() => {
    if (isOpen && mod) {
      setMcUsername(session?.user?.mcUsername || session?.user?.username || '');
      setReason('');
      setProjectUrl(mod.projectUrl || '');
      setAgreed(true);
      setError(null);
      setIsSubmitted(false);
    }
  }, [isOpen, mod, session]);

  if (!isOpen || !mod) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) {
      setError('Пожалуйста, укажите причину или назначение мода');
      return;
    }
    if (!agreed) {
      setError('Необходимо подтвердить отсутствие запрещенных функций');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const payload = {
        name: mod.name,
        filename: mod.filename,
        hashSha1: mod.hashSha1 || 'sha1_pending_' + mod.id,
      };

      const result = await submitModWhitelistRequest(payload, session, serverUrl, {
        mc_username: mcUsername.trim() || 'Player',
        reason: reason.trim(),
        project_url: projectUrl.trim(),
      });

      if (result.success) {
        setIsSubmitted(true);
        onSuccess(mod.id);
      } else {
        setError(result.message || 'Ошибка отправки заявки на сервер');
      }
    } catch (err: any) {
      setError(err.message || 'Не удалось связаться с сервером');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200 select-none">
      {/* Modal Backdrop Click Target */}
      <div className="absolute inset-0" onClick={onClose} />

      {/* Modal Window Container */}
      <div 
        className="relative w-full max-w-lg rounded-3xl bg-zinc-900 border border-white/10 shadow-2xl overflow-hidden p-6 md:p-7 space-y-5 animate-in zoom-in-95 duration-200 z-10"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4 pb-2 border-b border-white/5">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-zinc-800 border border-white/10 flex items-center justify-center text-emerald-400">
                <ShieldCheck size={18} />
              </div>
              <h3 className="text-base font-bold text-white">Заявка на добавление мода</h3>
            </div>
            <p className="text-xs text-zinc-400">
              Бот автоматически перешлет заявку администрации сервера в Discord
            </p>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-zinc-800/80 hover:bg-zinc-700 text-zinc-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {isSubmitted ? (
          /* Success Screen */
          <div className="py-8 flex flex-col items-center text-center space-y-4 animate-in fade-in duration-300">
            <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shadow-lg shadow-emerald-500/10">
              <CheckCircle2 size={36} />
            </div>

            <div className="space-y-1.5 max-w-sm">
              <h4 className="text-base font-bold text-white">Заявка успешно отправлена!</h4>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Бот переслал данные о моде «<span className="text-zinc-200 font-semibold">{mod.name}</span>» в канал модерации. После одобрения администрацией мод сразу станет доступен в лаунчере.
              </p>
            </div>

            <button
              onClick={onClose}
              className="mt-3 px-6 py-2.5 rounded-2xl bg-white hover:bg-zinc-200 text-black text-xs font-bold transition-all cursor-pointer shadow-md active:scale-95"
            >
              Отлично, понятно
            </button>
          </div>
        ) : (
          /* Submission Form */
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 rounded-2xl bg-rose-950/40 border border-rose-500/20 flex items-center gap-2.5 text-xs text-rose-300">
                <AlertCircle size={15} className="shrink-0 text-rose-400" />
                <span>{error}</span>
              </div>
            )}

            {/* Mod Info Card */}
            <div className="p-3.5 rounded-2xl bg-zinc-950/60 border border-white/5 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-zinc-400 flex items-center gap-1.5">
                  <FileCode size={13} className="text-zinc-500" />
                  <span>Мод</span>
                </span>
                <span className="font-bold text-white">{mod.name}</span>
              </div>

              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-zinc-500">Файл</span>
                <span className="text-zinc-300 truncate max-w-[260px]">{mod.filename}</span>
              </div>

              {mod.hashSha1 && (
                <div className="flex items-center justify-between text-[11px] font-mono text-zinc-500">
                  <span className="flex items-center gap-1">
                    <Hash size={11} /> SHA-1
                  </span>
                  <span className="text-zinc-400 truncate max-w-[260px]">{mod.hashSha1.slice(0, 16)}...</span>
                </div>
              )}
            </div>

            {/* Applicant Minecraft Username */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-zinc-300">
                Ваш ник в игре
              </label>
              <input
                type="text"
                value={mcUsername}
                onChange={(e) => setMcUsername(e.target.value)}
                placeholder="Steve"
                className="w-full bg-zinc-950/80 border border-white/10 rounded-2xl px-4 py-2.5 text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-white/30"
                required
              />
            </div>

            {/* Reason / Purpose */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-zinc-300">
                Для чего нужен мод / Описание назначения <span className="text-rose-400">*</span>
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Например: 3D позиционный голосовой чат для общения на сервере..."
                rows={3}
                className="w-full bg-zinc-950/80 border border-white/10 rounded-2xl p-3.5 text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-white/30 resize-none leading-relaxed"
                required
              />
            </div>

            {/* Optional Project URL */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-zinc-400 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Link size={12} />
                  <span>Ссылка на Modrinth / CurseForge (необязательно)</span>
                </span>
              </label>
              <input
                type="url"
                value={projectUrl}
                onChange={(e) => setProjectUrl(e.target.value)}
                placeholder="https://modrinth.com/mod/..."
                className="w-full bg-zinc-950/80 border border-white/10 rounded-2xl px-4 py-2 text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-white/30"
              />
            </div>

            {/* Checkbox agreement */}
            <label className="flex items-start gap-2.5 cursor-pointer pt-1">
              <input
                type="checkbox"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
                className="mt-0.5 rounded border-zinc-700 bg-zinc-950 text-white focus:ring-0 cursor-pointer"
              />
              <span className="text-[11px] text-zinc-400 leading-snug">
                Я подтверждаю, что мод не содержит запрещенных чит-функций (X-Ray, авто-кликеры, боты) и не нарушает правила игры.
              </span>
            </label>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/5">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="px-4 py-2 rounded-2xl text-xs font-semibold text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
              >
                Отмена
              </button>

              <button
                type="submit"
                disabled={isSubmitting || !reason.trim() || !agreed}
                className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-white hover:bg-zinc-200 text-black text-xs font-bold transition-all cursor-pointer shadow-md active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    <span>Отправка боту...</span>
                  </>
                ) : (
                  <>
                    <Send size={14} />
                    <span>Отправить заявку</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
