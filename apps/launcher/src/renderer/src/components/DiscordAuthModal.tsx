import React, { useState } from 'react';
import { X, CheckCircle, AlertCircle, Sparkles, User, ShieldCheck, Gamepad2, ArrowRight } from 'lucide-react';
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
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 select-none">
      <div className="bg-black border border-x-border rounded-3xl w-full max-w-md overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-x-border">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-x-surface border border-x-border flex items-center justify-center text-x-purpleLight">
              <ShieldCheck size={18} />
            </div>
            <div>
              <h3 className="font-extrabold text-white text-base">Авторизация quiby.</h3>
              <p className="text-xs text-x-textMuted">Discord OAuth2 и вайтлист 6 сезона</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-x-textMuted hover:text-white p-1.5 rounded-full hover:bg-white/10 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Tab Switcher */}
        {!pendingDiscordUser && (
          <div className="flex border-b border-x-border bg-x-surface/40 px-5 pt-3 gap-6">
            <button
              onClick={() => setMode('discord')}
              className={`pb-2.5 text-xs font-bold border-b-2 transition-all ${
                mode === 'discord'
                  ? 'border-x-purple text-white'
                  : 'border-transparent text-x-textMuted hover:text-white'
              }`}
            >
              Discord OAuth2
            </button>
            <button
              onClick={() => setMode('dev')}
              className={`pb-2.5 text-xs font-bold border-b-2 transition-all ${
                mode === 'dev'
                  ? 'border-x-purple text-white'
                  : 'border-transparent text-x-textMuted hover:text-white'
              }`}
            >
              Локальный тест (Dev)
            </button>
          </div>
        )}

        {/* Body */}
        <div className="p-6 space-y-4">
          {error && (
            <div className="p-3.5 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-start gap-2.5">
              <AlertCircle size={16} className="shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Step 2: Minecraft IGN Binding */}
          {pendingDiscordUser ? (
            <form onSubmit={handleBindMinecraft} className="space-y-4">
              <div className="p-3 rounded-2xl bg-x-surface border border-x-border flex items-center gap-3">
                <img
                  src={pendingDiscordUser.avatarUrl || 'https://cdn.discordapp.com/embed/avatars/0.png'}
                  alt="Discord Avatar"
                  className="w-10 h-10 rounded-full border border-x-border"
                />
                <div>
                  <div className="text-[11px] text-x-textMuted">Discord профиль:</div>
                  <div className="text-sm font-bold text-white">@{pendingDiscordUser.username}</div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-white mb-1.5">
                  Укажите ник в Minecraft (IGN):
                </label>
                <div className="relative">
                  <Gamepad2 className="absolute left-3.5 top-3 text-x-textMuted" size={16} />
                  <input
                    type="text"
                    required
                    pattern="^[a-zA-Z0-9_]{3,16}$"
                    value={mcUsername}
                    onChange={(e) => setMcUsername(e.target.value)}
                    placeholder="Например: Cl0rex"
                    className="w-full bg-x-surface border border-x-border rounded-full pl-10 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-x-purple font-mono"
                  />
                </div>
                <p className="text-[11px] text-x-textDim mt-1 pl-1">
                  * Ник привязывается к вашему Discord аккаунту 1:1 для вайтлиста.
                </p>
              </div>

              <button
                type="submit"
                disabled={loading || !mcUsername.trim()}
                className="w-full py-3 rounded-full bg-white hover:bg-neutral-200 disabled:opacity-50 text-black font-extrabold text-sm flex items-center justify-center gap-2 shadow-sm transition-all active:scale-98"
              >
                {loading ? 'Привязка...' : 'Подтвердить и войти'}
                <ArrowRight size={16} />
              </button>
            </form>
          ) : mode === 'discord' ? (
            /* Step 1: Discord OAuth2 */
            <div className="space-y-4 text-center">
              <p className="text-xs text-x-text leading-relaxed text-left">
                Авторизация через Discord гарантирует доступ в вайтлист сервера 6 сезона и связывает ваш ник с профилем.
              </p>

              <div className="p-3.5 rounded-2xl bg-x-surface border border-x-border text-left text-xs text-x-text space-y-1.5">
                <div className="flex items-center gap-2 text-x-purpleLight font-bold">
                  <CheckCircle size={14} />
                  <span>Преимущества:</span>
                </div>
                <ul className="text-x-textMuted space-y-1 pl-1 text-[11px]">
                  <li>• Защита от мультиаккаунтов и автоматический вайтлист</li>
                  <li>• Доступ к сборке Minecraft 1.21.1 NeoForge</li>
                  <li>• Синхронизация ролей в Discord</li>
                </ul>
              </div>

              <button
                type="button"
                onClick={handleStartDiscordAuth}
                disabled={loading}
                className="w-full py-3 rounded-full bg-white hover:bg-neutral-200 disabled:opacity-50 text-black font-extrabold text-sm flex items-center justify-center gap-2.5 shadow-sm transition-all active:scale-98 cursor-pointer"
              >
                <User size={17} />
                <span>{loading ? 'Ожидание браузера...' : 'Войти через Discord'}</span>
              </button>
            </div>
          ) : (
            /* Dev Login */
            <form onSubmit={handleDevLogin} className="space-y-3">
              <p className="text-xs text-x-textMuted">
                Быстрый вход для локального тестирования без Discord API.
              </p>

              <div>
                <label className="block text-xs font-bold text-white mb-1">
                  Minecraft Ник:
                </label>
                <input
                  type="text"
                  required
                  value={devUsername}
                  onChange={(e) => setDevUsername(e.target.value)}
                  className="w-full bg-x-surface border border-x-border rounded-full px-4 py-2 text-sm text-white font-mono focus:outline-none focus:border-x-purple"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-white mb-1">
                  Тестовый Discord Tag:
                </label>
                <input
                  type="text"
                  required
                  value={devTag}
                  onChange={(e) => setDevTag(e.target.value)}
                  className="w-full bg-x-surface border border-x-border rounded-full px-4 py-2 text-sm text-white font-mono focus:outline-none focus:border-x-purple"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-full bg-white hover:bg-neutral-200 disabled:opacity-50 text-black font-extrabold text-sm flex items-center justify-center gap-2 shadow-sm transition-all active:scale-98"
              >
                {loading ? 'Вход...' : 'Войти в тестовом режиме'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
