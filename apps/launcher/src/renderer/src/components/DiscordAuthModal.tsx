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
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-quiby-card border border-quiby-border rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-5 border-b border-quiby-border">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#5865F2] flex items-center justify-center text-white">
              <ShieldCheck size={18} />
            </div>
            <div>
              <h3 className="font-bold text-white text-base">Авторизация на quiby.</h3>
              <p className="text-xs text-slate-400">Вход через Discord и верификация вайтлиста</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Tab Switcher (Discord vs Dev Login) */}
        {!pendingDiscordUser && (
          <div className="flex border-b border-quiby-border bg-quiby-panel/40 px-5 pt-3 gap-4">
            <button
              onClick={() => setMode('discord')}
              className={`pb-3 text-xs font-semibold border-b-2 transition-all ${
                mode === 'discord'
                  ? 'border-[#5865F2] text-white'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              Discord OAuth2
            </button>
            <button
              onClick={() => setMode('dev')}
              className={`pb-3 text-xs font-semibold border-b-2 transition-all ${
                mode === 'dev'
                  ? 'border-emerald-500 text-emerald-400'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              Локальный тест (Dev)
            </button>
          </div>
        )}

        {/* Modal Body */}
        <div className="p-6 space-y-4">
          {error && (
            <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-start gap-2.5">
              <AlertCircle size={16} className="shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* STEP 2: Bind Minecraft IGN */}
          {pendingDiscordUser ? (
            <form onSubmit={handleBindMinecraft} className="space-y-4">
              <div className="p-3 rounded-xl bg-quiby-panel border border-quiby-border flex items-center gap-3">
                <img
                  src={pendingDiscordUser.avatarUrl || 'https://cdn.discordapp.com/embed/avatars/0.png'}
                  alt="Discord Avatar"
                  className="w-10 h-10 rounded-full"
                />
                <div>
                  <div className="text-xs text-slate-400">Авторизован Discord:</div>
                  <div className="text-sm font-bold text-white">@{pendingDiscordUser.username}</div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Укажите ваш ник в Minecraft (IGN):
                </label>
                <div className="relative">
                  <Gamepad2 className="absolute left-3.5 top-3 text-slate-400" size={16} />
                  <input
                    type="text"
                    required
                    pattern="^[a-zA-Z0-9_]{3,16}$"
                    value={mcUsername}
                    onChange={(e) => setMcUsername(e.target.value)}
                    placeholder="Например: Cl0rex"
                    className="w-full bg-quiby-panel border border-quiby-border rounded-xl pl-10 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500 font-mono"
                  />
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  * Ник привязывается к вашему Discord аккаунту навсегда. Изменить можно только через администратора.
                </p>
              </div>

              <button
                type="submit"
                disabled={loading || !mcUsername.trim()}
                className="w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white font-semibold text-sm flex items-center justify-center gap-2 shadow-glow-green transition-all"
              >
                {loading ? 'Привязка...' : 'Подтвердить и войти'}
                <ArrowRight size={16} />
              </button>
            </form>
          ) : mode === 'discord' ? (
            /* STEP 1: Discord OAuth2 */
            <div className="space-y-4 text-center">
              <p className="text-xs text-slate-300 leading-relaxed text-left">
                Авторизация через Discord гарантирует безопасность аккаунта, автоматический доступ в вайтлист сервера 6 сезона и защиту от мультиаккаунтов.
              </p>

              <div className="p-3.5 rounded-xl bg-[#5865F2]/10 border border-[#5865F2]/20 text-left text-xs text-slate-300 space-y-1.5">
                <div className="flex items-center gap-2 text-[#7983f5] font-semibold">
                  <CheckCircle size={14} />
                  <span>Что даёт привязка:</span>
                </div>
                <ul className="list-disc list-inside text-slate-400 space-y-0.5 pl-1 text-[11px]">
                  <li>Доступ к сборке с Create Aeronautics (1.21.1 NeoForge)</li>
                  <li>Единый Discord ↔ Minecraft профиль</li>
                  <li>Синхронизация ролей и статуса игрока</li>
                </ul>
              </div>

              <button
                type="button"
                onClick={handleStartDiscordAuth}
                disabled={loading}
                className="w-full py-3 rounded-xl bg-[#5865F2] hover:bg-[#4752c4] disabled:opacity-50 text-white font-bold text-sm flex items-center justify-center gap-2.5 shadow-lg shadow-[#5865F2]/30 transition-all cursor-pointer"
              >
                <User size={18} />
                <span>{loading ? 'Ожидание авторизации в браузере...' : 'Войти с аккаунтом Discord'}</span>
              </button>
            </div>
          ) : (
            /* DEV LOGIN (Fast Local Testing) */
            <form onSubmit={handleDevLogin} className="space-y-3">
              <p className="text-xs text-slate-300">
                Быстрый вход для тестирования без использования Discord API.
              </p>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Minecraft Никнейм:
                </label>
                <input
                  type="text"
                  required
                  value={devUsername}
                  onChange={(e) => setDevUsername(e.target.value)}
                  className="w-full bg-quiby-panel border border-quiby-border rounded-xl px-3.5 py-2 text-sm text-white font-mono focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Тестовый Discord Tag:
                </label>
                <input
                  type="text"
                  required
                  value={devTag}
                  onChange={(e) => setDevTag(e.target.value)}
                  className="w-full bg-quiby-panel border border-quiby-border rounded-xl px-3.5 py-2 text-sm text-white font-mono focus:outline-none focus:border-emerald-500"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white font-semibold text-sm flex items-center justify-center gap-2 shadow-glow-green transition-all"
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
