import React, { useEffect, useState } from 'react';
import { AlertCircle, ArrowRight, Loader2, Check } from 'lucide-react';
import { AuthSession } from '@quiby/shared';
import quibyLogo from '../assets/quiby_logo.png';
import seasonLogo from '../assets/quiby_season6_logo.png';
import { authScenes } from '../utils/buildScreenshots';
import './auth.css';

const screenWall = authScenes;

interface DiscordAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (session: AuthSession) => void;
  serverUrl: string;
}

export const DiscordAuthModal: React.FC<DiscordAuthModalProps> = ({ isOpen, onClose, onSuccess, serverUrl }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Binding state (Step 2 of Discord auth)
  const [pendingDiscordUser, setPendingDiscordUser] = useState<any>(null);
  const [tempBindingToken, setTempBindingToken] = useState<string | null>(null);
  const [mcUsername, setMcUsername] = useState('');

  useEffect(() => {
    if (!isOpen) {
      setPendingDiscordUser(null);
      setTempBindingToken(null);
      setError(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleStartDiscordAuth = async () => {
    setLoading(true);
    setError(null);

    try {
      if (!window.quibyApi) throw new Error('Вход через Discord доступен в приложении лаунчера. Откройте quiby на компьютере.');
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

  return (
    <main className="auth-page" aria-labelledby="auth-title">
      <div className="auth-gallery" aria-hidden="true">
        <div className="auth-screen-wall">
          {[0, 1, 2, 3].map(column => {
            const screens = Array.from({ length: 5 }, (_, row) => screenWall[(column + row * 4) % screenWall.length]);
            return <div className="auth-column" key={column}>
              {[0, 1].map(copy => <div className="auth-column-group" key={copy}>
                {screens.map((screen, index) => <div className="auth-screen" key={index}>
                  {column === 1 && index === 1 ? <img className="auth-wall-logo" src={seasonLogo} alt="" /> : <img src={screen} alt="" decoding="async" />}
                </div>)}
              </div>)}
            </div>;
          })}
        </div>
      </div>

      <header className="auth-topbar">
        <img src={quibyLogo} alt="quiby." className="auth-brand" />
        <button type="button" className="auth-skip" onClick={onClose} disabled={loading}>
          К лаунчеру <ArrowRight size={14} />
        </button>
      </header>

      <div className="auth-content">
        <div className="auth-intro">
          <p className="auth-season"><span /> СЕЗОН 06 · CREATE & AERONAUTICS</p>
          <h1 id="auth-title">СОЗДАВАЙ<br />СВОЙ МИР<span>.</span></h1>
          <p className="auth-description">Большие механизмы. Смелые постройки.<br />И люди, с которыми хочется играть.</p>
          <p className="auth-edition">MINECRAFT 1.21.1 <span>NEOFORGE</span></p>
        </div>

        <section className="auth-form-panel" aria-labelledby="auth-form-title" aria-busy={loading}>
          <span className="auth-form-eyebrow">ТВОЯ ИСТОРИЯ НА QUIBY</span>
          <h2 id="auth-form-title">{pendingDiscordUser ? 'Как тебя зовут в игре?' : 'Увидимся в игре.'}</h2>
          <p className="auth-form-copy">{pendingDiscordUser
            ? `Discord ${pendingDiscordUser.globalName || pendingDiscordUser.username} подключён. Осталось привязать Minecraft-ник.`
            : 'Войди через Discord, чтобы связать профиль с ником Minecraft и получить доступ к серверу.'}</p>

          {error && <div className="auth-error" role="alert"><AlertCircle size={16} /><span>{error}</span></div>}

          {pendingDiscordUser ? (
            <form onSubmit={handleBindMinecraft} className="auth-form">
              <label htmlFor="auth-mc-name">Ник в Minecraft</label>
              <input id="auth-mc-name" value={mcUsername} onChange={(e) => setMcUsername(e.target.value)}
                placeholder="Твой игровой ник" autoComplete="username" minLength={3} maxLength={16}
                pattern="[a-zA-Z0-9_]{3,16}" title="От 3 до 16 латинских букв, цифр или знаков подчёркивания"
                required disabled={loading} autoFocus />
              <button className="auth-submit" disabled={loading || !tempBindingToken}>
                {loading ? <Loader2 className="auth-spinner" size={18} /> : <Check size={18} />}
                {loading ? 'Привязываем ник…' : 'Начать играть'}
              </button>
            </form>
          ) : (
            <>
              <button type="button" className="auth-submit" onClick={handleStartDiscordAuth} disabled={loading}>
                {loading ? <Loader2 className="auth-spinner" size={19} /> : (
                  <svg width="21" height="17" viewBox="0 0 24 20" fill="currentColor" aria-hidden="true"><path d="M20.3 1.8A19.7 19.7 0 0 0 15.5.3l-.6 1.3a18.3 18.3 0 0 0-5.8 0L8.5.3a19.7 19.7 0 0 0-4.8 1.5C.7 6.2-.1 10.5.3 14.8a19.8 19.8 0 0 0 5.9 3l1.2-2a12 12 0 0 1-1.8-.9l.4-.3c3.8 1.7 8.2 1.7 12 0l.4.3a12 12 0 0 1-1.8.9l1.2 2a19.8 19.8 0 0 0 5.9-3c.5-5-1-9.3-3.4-13ZM8 12.3c-1.2 0-2.1-1.1-2.1-2.4S6.8 7.5 8 7.5s2.1 1.1 2.1 2.4-.9 2.4-2.1 2.4Zm8 0c-1.2 0-2.1-1.1-2.1-2.4s.9-2.4 2.1-2.4 2.1 1.1 2.1 2.4-.9 2.4-2.1 2.4Z" /></svg>
                )}
                {loading ? 'Ожидаем вход в браузере…' : 'Продолжить с Discord'}
                {!loading && <ArrowRight size={16} />}
              </button>
              <p className="auth-help">{loading ? 'Заверши вход в открывшемся браузере. Лаунчер продолжит автоматически.' : 'Откроем безопасную страницу входа в браузере.'}</p>
            </>
          )}
        </section>
      </div>
      <footer className="auth-footer"><span>QUIBY. MADE TO PLAY TOGETHER.</span><span>ТВОЙ НОВЫЙ СЕЗОН НАЧИНАЕТСЯ ЗДЕСЬ</span></footer>
    </main>
  );
};
