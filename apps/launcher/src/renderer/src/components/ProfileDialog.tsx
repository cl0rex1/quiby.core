import { DiscordAvatar } from './DiscordAvatar';
import { FormEvent, useEffect, useState } from 'react';
import { AlertCircle, CheckCircle2, LogOut, UserRound, X } from 'lucide-react';
import type { AuthSession } from '@quiby/shared';

interface Props {
  session: AuthSession | null;
  serverUrl: string;
  onClose: () => void;
  onSignOut: () => void;
}

export function ProfileDialog({ session, serverUrl, onClose, onSignOut }: Props) {
  const [changingUsername, setChangingUsername] = useState(false);
  const [requestedUsername, setRequestedUsername] = useState('');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    if (!session) return;
    setChangingUsername(false);
    setRequestedUsername('');
    setReason('');
    setError('');
    setNotice('');
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [session, onClose]);

  if (!session) return null;

  const submitUsernameChange = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setError('');
    setNotice('');
    try {
      const response = await fetch(`${serverUrl}/api/auth/mc-username-change-request`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestedUsername: requestedUsername.trim(), reason: reason.trim() }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error || 'Не удалось отправить заявку.');
      setChangingUsername(false);
      setRequestedUsername('');
      setReason('');
      setNotice('Заявка отправлена администрации. Текущий ник изменится после одобрения.');
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Не удалось отправить заявку.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 px-5" onMouseDown={onClose}>
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="profile-title"
        className="w-full max-w-sm rounded-2xl border border-[#39313f] bg-[#1a181d] p-6 shadow-2xl"
        onMouseDown={event => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#bb74ff]">QUIBY / ПРОФИЛЬ</p>
            <h2 id="profile-title" className="mt-1 text-xl font-bold text-white">Твой аккаунт</h2>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-2 text-zinc-400 hover:bg-white/10 hover:text-white" aria-label="Закрыть профиль">
            <X size={18} />
          </button>
        </div>
        <div className="mt-6 flex items-center gap-4 rounded-xl border border-white/10 bg-white/5 p-4">
          <DiscordAvatar user={session.user} className="h-14 w-14 rounded-xl object-cover" />
          <div className="min-w-0">
            <p className="truncate text-base font-semibold text-white">{session.user.mcUsername}</p>
            <p className="truncate text-xs text-zinc-400">Discord: {session.user.globalName || session.user.username}</p>
          </div>
        </div>
        {notice && <p role="status" className="mt-4 flex items-start gap-2 rounded-xl border border-emerald-400/20 bg-emerald-400/10 p-3 text-xs text-emerald-200"><CheckCircle2 size={15} className="mt-0.5 shrink-0" />{notice}</p>}
        {error && <p role="alert" className="mt-4 flex items-start gap-2 rounded-xl border border-rose-400/20 bg-rose-400/10 p-3 text-xs text-rose-200"><AlertCircle size={15} className="mt-0.5 shrink-0" />{error}</p>}
        {changingUsername ? (
          <form onSubmit={submitUsernameChange} className="mt-4 space-y-3 rounded-xl border border-white/10 bg-white/[0.03] p-4">
            <label className="block space-y-1.5 text-xs text-zinc-300">
              <span>Новый ник Minecraft</span>
              <input autoFocus value={requestedUsername} onChange={event => setRequestedUsername(event.target.value)} minLength={3} maxLength={16} pattern="[A-Za-z0-9_]+" required disabled={submitting} className="w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-white outline-none focus:border-[#bb74ff]" placeholder="Например, QuibyPlayer" />
            </label>
            <label className="block space-y-1.5 text-xs text-zinc-300">
              <span>Почему нужно изменить ник</span>
              <textarea value={reason} onChange={event => setReason(event.target.value)} minLength={5} maxLength={500} required disabled={submitting} rows={2} className="w-full resize-none rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-white outline-none focus:border-[#bb74ff]" placeholder="Например, ошибся при вводе" />
            </label>
            <p className="text-[11px] leading-relaxed text-zinc-500">Смена ника проверяется администрацией. До одобрения аккаунт останется с текущим ником.</p>
            <div className="flex gap-2">
              <button type="button" onClick={() => { setChangingUsername(false); setError(''); }} disabled={submitting} className="flex-1 rounded-lg border border-white/10 px-3 py-2 text-xs text-zinc-300 hover:bg-white/5 disabled:opacity-50">Отмена</button>
              <button type="submit" disabled={submitting} className="flex-1 rounded-lg bg-[#a65ee8] px-3 py-2 text-xs font-semibold text-white hover:bg-[#bc7ff0] disabled:opacity-50">{submitting ? 'Отправляем…' : 'Подать заявку'}</button>
            </div>
          </form>
        ) : (
          <button type="button" onClick={() => { setChangingUsername(true); setRequestedUsername(session.user.mcUsername); setNotice(''); setError(''); }} className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-[#bb74ff]/35 bg-[#bb74ff]/10 px-4 py-2.5 text-sm font-medium text-[#e0c3ff] transition-colors hover:border-[#bb74ff]/60 hover:bg-[#bb74ff]/15">
            <UserRound size={16} /> Сменить ник через заявку
          </button>
        )}
        <button type="button" onClick={onSignOut} className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 px-4 py-2.5 text-sm text-zinc-300 transition-colors hover:border-rose-400/40 hover:bg-rose-400/10 hover:text-rose-200">
          <LogOut size={16} /> Выйти из аккаунта
        </button>
      </section>
    </div>
  );
}
