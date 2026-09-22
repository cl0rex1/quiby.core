import React, { useState } from 'react';
import { X, CheckCircle, AlertCircle, User, ShieldCheck, Gamepad2, ArrowRight, Sparkles } from 'lucide-react';
import { AuthSession } from '@quiby/shared';

interface DiscordAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (session: AuthSession) => void;
  serverUrl: string;
}

export const DiscordAuthModal: React.FC<DiscordAuthModalProps> = ({ isOpen, onClose, onSuccess, serverUrl }) => {
  const [mode, setMode] = useState<'discord' | 'dev'>('discord');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Binding state (Step 2 of Discord auth)
  const [pendingDiscordUser, setPendingDiscordUser] = useState<any>(null);
  const [tempBindingToken, setTempBindingToken] = useState<string | null>(null);
  const [mcUsername, setMcUsername] = useState('');

  // Dev login state
  const [devUsername, setDevUsername] = useState('Cl0rex');
  const [devTag, setDevTag] = useState('cl0rex#0001');

  if (!isOpen) return null;

  const handleStartDiscordAuth = async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await window.quibyApi.startDiscordLogin(serverUrl);
      if (result.error) {
        setError(result.error);
      } else if (result.needsBinding) {
        setPendingDiscordUser(result.discordUser);
        if (result.tempBindingToken) {
          setTempBindingToken(result.tempBindingToken);
        }
      } else if (result.session) {
        onSuccess(result.session);
        onClose();
      }
    } catch (err: any) {
      setError(err.message || 'Ошибка авторизации Discord');
    } finally {
      setLoading(false);
    }
  };

  const handleBindMinecraft = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mcUsername.trim() || !pendingDiscordUser) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`${serverUrl}/api/auth/bind-mc`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tempBindingToken,
          discordId: pendingDiscordUser.id,
          discordUsername: pendingDiscordUser.username,
          discordGlobalName: pendingDiscordUser.globalName,
          discordAvatar: pendingDiscordUser.avatar,
          roles: pendingDiscordUser.roles || [],
          mcUsername: mcUsername.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Не удалось привязать ник');
      }

      onSuccess(data.session);
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDevLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`${serverUrl}/api/auth/dev-login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: devUsername.trim(),
          discordTag: devTag.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Ошибка входа в тестовом режиме');
      }

      onSuccess(data.session);
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 select-none animate-in fade-in duration-200">
      <div className="surface-panel rounded-3xl w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200 border border-surface-border">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-purple-300 shadow-sm">
              <ShieldCheck size={20} />
            </div>
            <div>
              <h3 className="font-extrabold text-white text-base apple-heading">Авторизация Quiby</h3>
              <p className="text-xs text-zinc-400 font-mono">Discord OAuth2 и вайтлист Season VI</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-white p-1.5 rounded-full hover:bg-zinc-800 transition-colors press-feedback"
          >
            <X size={18} />
          </button>
        </div>

        {/* Tab Switcher */}
        {!pendingDiscordUser && (
          <div className="flex border-b border-white/10 bg-zinc-950/40 px-5 pt-3 gap-6">
            <button
              onClick={() => setMode('discord')}
              className={`pb-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer press-feedback ${
                mode === 'discord'
                  ? 'border-purple-400 text-white'
                  : 'border-transparent text-zinc-400 hover:text-white'
              }`}
            >
              Discord OAuth2
            </button>
            <button
              onClick={() => setMode('dev')}
              className={`pb-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer press-feedback ${
                mode === 'dev'
                  ? 'border-purple-400 text-white'
                  : 'border-transparent text-zinc-400 hover:text-white'
              }`}
            >
              Локальный тест (Dev)
            </button>
          </div>
        )}

        {/* Body */}
        <div className="p-6 space-y-4">
          {error && (
            <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2.5">
              <AlertCircle size={16} className="shrink-0 mt-0.5 text-rose-400" />
              <span className="apple-body">{error}</span>
            </div>
          )}

          {/* Step 2: Minecraft IGN Binding */}
          {pendingDiscordUser ? (
            <form onSubmit={handleBindMinecraft} className="space-y-4">
              <div className="p-3.5 rounded-2xl surface-card flex items-center gap-3">
                <img
                  src={pendingDiscordUser.avatarUrl || 'https://cdn.discordapp.com/embed/avatars/0.png'}
                  alt="Discord Avatar"
                  className="w-10 h-10 rounded-full border border-white/10"
                />
                <div>
                  <div className="text-[11px] text-zinc-400">Discord профиль:</div>
                  <div className="text-sm font-bold text-white apple-subheading">@{pendingDiscordUser.username}</div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-white mb-1.5 apple-subheading">
                  Укажите ник в Minecraft (IGN):
                </label>
                <div className="relative">
                  <Gamepad2 className="absolute left-3.5 top-3 text-zinc-500" size={16} />
                  <input
                    type="text"
                    required
                    pattern="^[a-zA-Z0-9_]{3,16}$"
                    value={mcUsername}
                    onChange={(e) => setMcUsername(e.target.value)}
                    placeholder="Например: Cl0rex"
                    className="w-full bg-zinc-900/90 border border-white/10 focus:border-purple-400 rounded-2xl pl-10 pr-4 py-2.5 text-sm text-white font-mono focus:outline-none transition-colors"
                  />
                </div>
                <p className="text-[11px] text-zinc-500 mt-1 pl-1 apple-body">
                  * Ник привязывается к вашему Discord аккаунту для вайтлиста сервера.
                </p>
              </div>

              <button
                type="submit"
                disabled={loading || !mcUsername.trim()}
                className="w-full py-3 rounded-full bg-white hover:bg-neutral-100 disabled:opacity-50 text-black font-extrabold text-sm flex items-center justify-center gap-2 shadow-md transition-all press-feedback cursor-pointer"
              >
                <span>{loading ? 'Привязка...' : 'Подтвердить и войти'}</span>
                <ArrowRight size={16} />
              </button>
            </form>
          ) : mode === 'discord' ? (
            /* Step 1: Discord OAuth2 */
            <div className="space-y-4 text-center">
              <p className="text-xs text-zinc-300 leading-relaxed text-left apple-body">
                Авторизация через Discord гарантирует доступ в вайтлист сервера 6 сезона и связывает ваш ник с профилем.
              </p>

              <div className="p-3.5 rounded-2xl surface-card text-left text-xs space-y-2">
                <div className="flex items-center gap-2 text-purple-300 font-bold apple-subheading">
                  <CheckCircle size={15} />
                  <span>Преимущества:</span>
                </div>
                <ul className="text-zinc-400 space-y-1 pl-1 text-[11px] apple-body">
                  <li>• Защита от мультиаккаунтов и автоматический вайтлист</li>
                  <li>• Доступ к сборке Minecraft 1.21.1 NeoForge</li>
                  <li>• Синхронизация ролей в Discord</li>
                </ul>
              </div>

              <button
                type="button"
                onClick={handleStartDiscordAuth}
                disabled={loading}
                className="w-full py-3.5 rounded-full bg-white hover:bg-neutral-100 disabled:opacity-50 text-black font-extrabold text-sm flex items-center justify-center gap-2.5 shadow-md transition-all press-feedback cursor-pointer"
              >
                <User size={18} />
                <span>{loading ? 'Ожидание браузера...' : 'Войти через Discord'}</span>
              </button>
            </div>
          ) : (
            /* Dev Login */
            <form onSubmit={handleDevLogin} className="space-y-3.5">
              <p className="text-xs text-zinc-400 apple-body">
                Быстрый вход для локального тестирования без Discord API.
              </p>

              <div>
                <label className="block text-xs font-bold text-white mb-1.5 apple-subheading">
                  Minecraft Ник:
                </label>
                <input
                  type="text"
                  required
                  value={devUsername}
                  onChange={(e) => setDevUsername(e.target.value)}
                  className="w-full bg-zinc-900/90 border border-white/10 focus:border-purple-400 rounded-2xl px-4 py-2 text-sm text-white font-mono focus:outline-none transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-white mb-1.5 apple-subheading">
                  Тестовый Discord Tag:
                </label>
                <input
                  type="text"
                  required
                  value={devTag}
                  onChange={(e) => setDevTag(e.target.value)}
                  className="w-full bg-zinc-900/90 border border-white/10 focus:border-purple-400 rounded-2xl px-4 py-2 text-sm text-white font-mono focus:outline-none transition-colors"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 rounded-full bg-white hover:bg-neutral-100 disabled:opacity-50 text-black font-extrabold text-sm flex items-center justify-center gap-2 shadow-md transition-all press-feedback cursor-pointer mt-2"
              >
                <span>{loading ? 'Вход...' : 'Войти в тестовом режиме'}</span>
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
