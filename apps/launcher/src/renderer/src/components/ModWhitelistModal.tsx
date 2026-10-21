import { useSubmitReview } from './ReviewContext';
import { ModIcon } from './ModIcon';
import React, { useState, useEffect, useRef } from 'react';
import { X, AlertCircle } from 'lucide-react';
import { AuthSession } from '@quiby/shared';
import { CustomModItem } from '../views/ModsView';
import { resolveModMetadata } from '../utils/knownMods';

interface ModWhitelistModalProps {
  isOpen: boolean;
  onClose: () => void;
  mod: CustomModItem | null;
  session?: AuthSession | null;
  serverUrl?: string;

}

export const ModWhitelistModal: React.FC<ModWhitelistModalProps> = ({
  isOpen,
  onClose,
  mod,
  session,
}) => {
  const submitReview = useSubmitReview();
  const [reason, setReason] = useState('');
  const [projectUrl, setProjectUrl] = useState('');
  const [error, setError] = useState<string | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    if (isOpen && mod) {
      setReason('');
      setProjectUrl(mod.projectUrl || '');
      setError(null);
      const element = dialog.current;
      const previousFocus = document.activeElement;
      element?.showModal();
      return () => { element?.close(); if (previousFocus instanceof HTMLElement && previousFocus.isConnected) previousFocus.focus(); };
    }
  }, [isOpen, mod?.id]);

  if (!isOpen || !mod) return null;
  const resourcePack = /\.zip$/i.test(mod.filename);

  const meta = resourcePack ? { displayName: mod.name, iconUrl: mod.iconUrl } : resolveModMetadata(
    mod.name,
    mod.filename,
    mod.description,
    mod.iconUrl
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) {
      setError('Пожалуйста, заполните описание файла');
      return;
    }

    try {
      submitReview(mod, reason.trim(), projectUrl.trim());
      onClose();
    } catch (error) { setError(error instanceof Error ? error.message : 'Не удалось начать отправку'); }

  };

  return (
    <dialog ref={dialog} className="launcher-dialog review-dialog" aria-labelledby="review-title"
      onCancel={onClose}
      onClick={event => { if (event.target === event.currentTarget) onClose(); }}>
      <div className="launcher-dialog-body space-y-5">
        {/* Header with Mod Logo */}
        <div className="flex items-center justify-between pb-3 border-b border-white/5">
          <div className="flex items-center gap-3 truncate">
            {/* Mod Logo */}
            <ModIcon src={meta.iconUrl} name={meta.displayName}/>

            <div className="truncate">
              <h3 id="review-title" className="text-sm font-bold text-white truncate">
                {meta.displayName}
              </h3>
              <p className="text-[11px] text-zinc-400">
                {resourcePack ? 'Заявка на ресурспак' : 'Заявка на добавление мода'}
              </p>
            </div>
          </div>

          <button
            type="button"
            aria-label="Закрыть заявку"
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer disabled:opacity-50"
          >
            <X size={15} />
          </button>
        </div>

        {!session?.token && <p className="inline-error">Войдите в аккаунт, чтобы отправить заявку.</p>}
        <p className="text-xs text-zinc-400">Вложение — до 20 МиБ. Статус появится в уведомлениях. Можно продолжать пользоваться лаунчером.</p>
        {/* Minimal Form: 2 Inputs Only */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div role="alert" className="p-3 rounded-2xl bg-rose-950/50 border border-rose-500/20 flex items-center gap-2.5 text-xs text-rose-300">
              <AlertCircle size={15} className="shrink-0 text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          {/* Description */}
          <div className="space-y-1.5">
            <label htmlFor="review-reason" className="block text-xs font-semibold text-zinc-300">
              Описание / Назначение <span className="text-rose-400">*</span>
            </label>
            <textarea
              id="review-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={resourcePack ? 'Для чего нужен этот ресурспак…' : 'Для чего нужен этот мод на сервере…'}
              rows={3}
              minLength={10}
              maxLength={1000}
              className="w-full bg-zinc-950/80 border border-white/10 rounded-2xl p-3.5 text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-white/30 resize-none leading-relaxed"
              required
              />
          </div>

          {/* Link (Optional) */}
          <div className="space-y-1.5">
            <label htmlFor="review-url" className="block text-xs font-semibold text-zinc-400">
              Ссылка на {resourcePack ? 'ресурспак' : 'мод'} (желательно)
            </label>
            <input
              id="review-url"
              type="url"
              value={projectUrl}
              onChange={(e) => setProjectUrl(e.target.value)}
              placeholder={resourcePack ? 'https://modrinth.com/resourcepack/…' : 'https://modrinth.com/mod/…'}
              className="w-full bg-zinc-950/80 border border-white/10 rounded-2xl px-3.5 py-2.5 text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-white/30"
              />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-white/5">
            <button
              type="button"
              onClick={onClose}
                className="px-4 py-2 rounded-2xl text-xs font-semibold text-zinc-400 hover:text-white transition-colors cursor-pointer disabled:opacity-50"
            >
              Отмена
            </button>

            <button
              type="submit"
              disabled={reason.trim().length < 10 || !session?.token}
              className="flex items-center gap-2 px-5 py-2 rounded-2xl bg-white hover:bg-zinc-200 text-black text-xs font-bold transition-all cursor-pointer shadow-md active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <span>Отправить заявку</span>
            </button>
          </div>
        </form>
      </div>
    </dialog>
  );
};
