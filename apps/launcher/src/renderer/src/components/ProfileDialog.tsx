import { DiscordAvatar } from './DiscordAvatar';
import { FormEvent, useEffect, useRef, useState } from 'react';
import { AlertCircle, CheckCircle2, LogOut, UserRound, ArrowUpRight, X } from 'lucide-react';
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
  const dialog = useRef<HTMLDialogElement>(null);
  const previousFocus = useRef(document.activeElement);
  const accountId = session?.user.discordId;

  useEffect(() => {
    if (!accountId) return;
    setChangingUsername(false);
    setRequestedUsername('');
    setReason('');
    setError('');
    setNotice('');
    const element = dialog.current;
    previousFocus.current = document.activeElement;
    element?.showModal();
    return () => {
      element?.close();
      if (previousFocus.current instanceof HTMLElement && previousFocus.current.isConnected) previousFocus.current.focus();
    };
  }, [accountId]);

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
        signal: AbortSignal.timeout(15000),
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
      <dialog
        ref={dialog}
        onCancel={event => { event.preventDefault(); if (!submitting) onClose(); }}
        onClick={event => { if (event.target === event.currentTarget && !submitting) onClose(); }}
        aria-modal="true"
        aria-labelledby="profile-title"
        className="launcher-dialog profile-dialog"
      >
        <div className="launcher-dialog-body profile-body">
          <header className="profile-header">
            <h2 id="profile-title">Профиль<span>.</span></h2>
            <button type="button" onClick={onClose} disabled={submitting} className="icon-button" aria-label="Закрыть профиль"><X size={17}/></button>
          </header>
          <section className="profile-account" aria-label="Твой аккаунт">
            <DiscordAvatar user={session.user} className="profile-avatar"/>
            <div className="profile-identity">
              <small>Minecraft</small>
              <strong title={session.user.mcUsername}>{session.user.mcUsername}</strong>
              <p title={session.user.globalName || session.user.username}>Discord: {session.user.globalName || session.user.username}</p>
            </div>
          </section>
          {notice && <p role="status" className="profile-feedback is-success"><CheckCircle2 size={16}/>{notice}</p>}
          {error && <p role="alert" className="profile-feedback is-error"><AlertCircle size={16}/>{error}</p>}
          {changingUsername ? (
            <form onSubmit={submitUsernameChange} className="profile-form" aria-busy={submitting}>
              <label>Новый ник Minecraft
                <input autoFocus value={requestedUsername} onChange={event => setRequestedUsername(event.target.value)} minLength={3} maxLength={16} pattern="[A-Za-z0-9_]+" required disabled={submitting} placeholder="Например, QuibyPlayer"/>
              </label>
              <label>Почему нужно изменить ник
                <textarea value={reason} onChange={event => setReason(event.target.value)} minLength={5} maxLength={500} required disabled={submitting} rows={2} placeholder="Например, ошибся при вводе"/>
              </label>
              <p className="profile-form-hint">Смена ника проверяется администрацией. До одобрения аккаунт останется с текущим ником.</p>
              <div className="profile-form-actions">
                <button type="button" onClick={() => { setChangingUsername(false); setError(''); }} disabled={submitting} className="ui-button">Отмена</button>
                <button type="submit" disabled={submitting} className="ui-button is-primary">{submitting ? 'Отправляем…' : 'Подать заявку'}</button>
              </div>
            </form>
          ) : (
            <button type="button" onClick={() => { setChangingUsername(true); setRequestedUsername(session.user.mcUsername); setNotice(''); setError(''); }} className="profile-rename">
              <span className="profile-action-icon"><UserRound size={16}/></span>
              <span>Сменить ник через заявку</span><ArrowUpRight size={15}/>
            </button>
          )}
          <footer className="profile-footer">
            <button type="button" onClick={onSignOut} disabled={submitting} className="profile-signout"><LogOut size={15}/>Выйти из аккаунта</button>
          </footer>
        </div>
      </dialog>
  );
}
