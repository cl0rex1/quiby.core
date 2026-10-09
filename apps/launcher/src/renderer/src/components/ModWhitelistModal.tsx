import React, { useState, useEffect } from 'react';
import { X, Loader2, AlertCircle, Package } from 'lucide-react';
import { AuthSession } from '@quiby/shared';
import { CustomModItem } from '../views/ModsView';
import { resolveModMetadata } from '../utils/knownMods';

interface ModWhitelistModalProps {
  isOpen: boolean;
  onClose: () => void;
  mod: CustomModItem | null;
  session?: AuthSession | null;
  serverUrl?: string;
  onSuccess: (modId: string, modName: string, message?: string) => void;
}

export const ModWhitelistModal: React.FC<ModWhitelistModalProps> = ({
  isOpen,
  onClose,
  mod,
  session,
  serverUrl = 'http://localhost:3001',
  onSuccess,
}) => {
  const [reason, setReason] = useState('');
  const [projectUrl, setProjectUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && mod) {
      setReason('');
      setProjectUrl(mod.projectUrl || '');
      setError(null);
      setIsSubmitting(false);
    }
  }, [isOpen, mod]);

  if (!isOpen || !mod) return null;
  const resourcePack = /\.zip$/i.test(mod.filename);

  const meta = resourcePack ? { displayName: mod.name, iconUrl: mod.iconUrl } : resolveModMetadata(
    mod.name,
    mod.filename,
    mod.description,
    mod.iconUrl
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) {
      setError('Пожалуйста, заполните описание файла');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      if (!mod.hashSha1 || !session?.token) throw new Error('Выберите файл и войдите в аккаунт.');
      const result = await window.quibyApi.uploadModReview(mod.hashSha1, session.token, {
        mod_name: mod.name.trim().slice(0, 100), filename: mod.filename, reason: reason.trim(), project_url: projectUrl.trim(),
      });
      if (result.success) {
        onSuccess(mod.id, meta.displayName, result.message);
        onClose();
      } else {
        setError(result.message || 'Ошибка отправки заявки на сервер');
        setIsSubmitting(false);
      }
    } catch (err: any) {
      setError(err.message || 'Не удалось связаться с сервером');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90  animate-in fade-in duration-150 select-none">
      {/* Backdrop click to dismiss */}
      <div className="absolute inset-0" onClick={!isSubmitting ? onClose : undefined} />

      {/* Clean & Minimal Modal Window */}
      <div 
        className="relative w-full max-w-md rounded-3xl bg-zinc-900 border border-white/10 shadow-2xl p-6 space-y-5 animate-in zoom-in-95 duration-150 z-10"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with Mod Logo */}
        <div className="flex items-center justify-between pb-3 border-b border-white/5">
          <div className="flex items-center gap-3 truncate">
            {/* Mod Logo */}
            <div className="w-10 h-10 rounded-xl bg-zinc-800 border border-white/10 flex items-center justify-center shrink-0 overflow-hidden shadow-sm">
              {meta.iconUrl ? (
                <img
                  src={meta.iconUrl}
                  alt={meta.displayName}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />
              ) : (
                <Package size={18} className="text-zinc-400" />
              )}
            </div>

            <div className="truncate">
              <h3 className="text-sm font-bold text-white truncate">
                {meta.displayName}
              </h3>
              <p className="text-[11px] text-zinc-400">
                {resourcePack ? 'Заявка на ресурспак' : 'Заявка на добавление мода'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="w-8 h-8 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer disabled:opacity-50"
          >
            <X size={15} />
          </button>
        </div>

        {!session?.token && <p className="inline-error">Войдите в аккаунт, чтобы отправить заявку.</p>}
        <p className="text-xs text-zinc-400">Администрация рассмотрит конкретную версию файла. Файл до 8 МиБ отправится вложением в Discord без хранения на диске API. Дождитесь подтверждения доставки. Решение появится автоматически.</p>
        {/* Minimal Form: 2 Inputs Only */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 rounded-2xl bg-rose-950/50 border border-rose-500/20 flex items-center gap-2.5 text-xs text-rose-300">
              <AlertCircle size={15} className="shrink-0 text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          {/* Description */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-zinc-300">
              Описание / Назначение <span className="text-rose-400">*</span>
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={resourcePack ? 'Для чего нужен этот ресурспак…' : 'Для чего нужен этот мод на сервере…'}
              rows={3}
              minLength={10}
              maxLength={1000}
              className="w-full bg-zinc-950/80 border border-white/10 rounded-2xl p-3.5 text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-white/30 resize-none leading-relaxed"
              required
              disabled={isSubmitting}
            />
          </div>

          {/* Link (Optional) */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-zinc-400">
              Ссылка на {resourcePack ? 'ресурспак' : 'мод'} (желательно)
            </label>
            <input
              type="url"
              value={projectUrl}
              onChange={(e) => setProjectUrl(e.target.value)}
              placeholder={resourcePack ? 'https://modrinth.com/resourcepack/…' : 'https://modrinth.com/mod/…'}
              className="w-full bg-zinc-950/80 border border-white/10 rounded-2xl px-3.5 py-2.5 text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-white/30"
              disabled={isSubmitting}
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-white/5">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-2xl text-xs font-semibold text-zinc-400 hover:text-white transition-colors cursor-pointer disabled:opacity-50"
            >
              Отмена
            </button>

            <button
              type="submit"
              disabled={isSubmitting || reason.trim().length < 10 || !session?.token}
              className="flex items-center gap-2 px-5 py-2 rounded-2xl bg-white hover:bg-zinc-200 text-black text-xs font-bold transition-all cursor-pointer shadow-md active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={13} className="animate-spin" />
                  <span>Отправка...</span>
                </>
              ) : (
                <span>Отправить заявку</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
