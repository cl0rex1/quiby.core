import React, { useState } from 'react';
import { ArrowUpCircle, Download, Loader2, RefreshCw, WifiOff } from 'lucide-react';
import type { UpdateState } from '../../../main/updates';

export function LauncherUpdateBanner({ state }: { state: UpdateState | null }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  if (!state || (!state.required && !['available', 'downloading', 'ready', 'error'].includes(state.status))) return null;
  const failed = state.status === 'error';
  const disconnected = failed && (/ERR_.*(?:INTERNET|NETWORK|NAME|CONNECTION|TIMED)|ENOTFOUND|EAI_AGAIN|ECONN|ETIMEDOUT|fetch failed|network/i.test(state.message || '')
    || (typeof navigator !== 'undefined' && navigator.onLine === false));
  const checking = state.status === 'checking';
  const downloading = state.status === 'downloading';
  const ready = state.status === 'ready';
  const percent = Math.max(0, Math.min(100, state.percent ?? 0));
  const act = async () => {
    setBusy(true);
    setError('');
    try {
      if (ready) await window.quibyApi.installUpdate();
      else if (state.status !== 'available' && state.status !== 'downloading') await window.quibyApi.checkForUpdates();
      else await window.quibyApi.downloadUpdate();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Не удалось обновить лаунчер. Повторите попытку.');
    } finally { setBusy(false); }
  };
  return (
    <section className={`launcher-update-banner${failed ? ' is-error' : ''}`} aria-label="Обновление лаунчера">
      {failed ? <WifiOff size={28} aria-hidden="true" className="shrink-0" /> : <ArrowUpCircle size={28} aria-hidden="true" className="shrink-0" />}
      <div className="min-w-0 flex-1" role="status">
        <strong>{failed ? disconnected ? 'Нет соединения с сервером обновлений' : 'Не удалось проверить или скачать обновление' : checking ? 'Проверяем обновления' : ready ? 'Обновление готово к установке' : downloading ? 'Скачиваем обязательное обновление' : state.required ? 'Обновление лаунчера обязательно' : 'Доступна новая версия лаунчера'}</strong>
        <p>{failed ? disconnected ? 'Проверьте подключение к интернету и доступ к GitHub, затем повторите попытку.' : 'Повторите проверку. Если ошибка остаётся, обратитесь к администрации.' : checking ? 'Ожидаем ответ сервера обновлений…' : downloading ? `${percent}% · Запуск Minecraft доступен после установки` : ready ? `Версия ${state.latestVersion} · Перезапустите приложение, чтобы обновиться` : state.required ? `Версия ${state.latestVersion || 'новее установленной'} · Обновите лаунчер, чтобы запустить Minecraft` : `Версия ${state.latestVersion} · Установите последние исправления и улучшения интерфейса`}</p>
        {error && <p role="alert">{error}</p>}
      </div>
      <button type="button" onClick={() => void act()} disabled={busy || downloading || checking}>
        {busy || downloading ? <Loader2 size={18} className="animate-spin" /> : ready ? <RefreshCw size={18} /> : <Download size={18} />}
        {downloading ? `${percent}%` : ready ? 'Перезапустить и обновить' : state.status === 'error' ? 'Повторить проверку' : 'Скачать обновление'}
      </button>
      {downloading && <div className="launcher-update-banner-progress" role="progressbar" aria-label="Скачивание обновления" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100}><span style={{ width: `${percent}%` }} /></div>}
    </section>
  );
}
