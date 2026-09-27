import { useEffect } from 'react';
import { LogOut, X } from 'lucide-react';
import type { AuthSession } from '@quiby/shared';

interface Props {
  session: AuthSession | null;
  onClose: () => void;
  onSignOut: () => void;
}

export function ProfileDialog({ session, onClose, onSignOut }: Props) {
  useEffect(() => {
    if (!session) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [session, onClose]);

  if (!session) return null;

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
          <img
            className="h-14 w-14 rounded-xl object-cover"
            src={session.user.avatarUrl || `https://mc-heads.net/avatar/${session.user.mcUsername}/64`}
            alt=""
          />
          <div className="min-w-0">
            <p className="truncate text-base font-semibold text-white">{session.user.mcUsername}</p>
            <p className="truncate text-xs text-zinc-400">Discord: {session.user.globalName || session.user.username}</p>
          </div>
        </div>
        <button type="button" onClick={onSignOut} className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 px-4 py-2.5 text-sm text-zinc-300 transition-colors hover:border-rose-400/40 hover:bg-rose-400/10 hover:text-rose-200">
          <LogOut size={16} /> Выйти из аккаунта
        </button>
      </section>
    </div>
  );
}
