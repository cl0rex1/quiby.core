import React, { useState } from 'react';
import { ArrowUpCircle, Download, Loader2, RefreshCw } from 'lucide-react';
import type { UpdateState } from '../../../main/updates';

export function LauncherUpdateBanner({ state }: { state: UpdateState | null }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  if (!state || (!state.required && !['available', 'downloading', 'ready', 'error'].includes(state.status))) return null;
  if (state.status === 'error' && !state.latestVersion) return null;
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
    <section className="launcher-update-banner" aria-label="Обновление лаунчера">
      <ArrowUpCircle size={28} aria-hidden="true" className="shrink-0" />
      <div className="min-w-0 flex-1" role="status">
        <strong>{ready ? 'Обновление готово к установке' : downloading ? 'Скачиваем обязательное обновление' : state.required ? 'Обновление лаунчера обязательно' : 'Доступна новая версия лаунчера'}</strong>
        <p>{downloading ? `${percent}% · Запуск Minecraft доступен после установки` : ready ? `Версия ${state.latestVersion} · Перезапустите приложение, чтобы обновиться` : state.required ? `Версия ${state.latestVersion} · Обновите лаунчер, чтобы запустить Minecraft` : `Версия ${state.latestVersion} · Установите последние исправления и улучшения интерфейса`}</p>
        {(error || state.status === 'error') && <p role="alert">{error || state.message || 'Не удалось загрузить обновление'}</p>}
      </div>
      <button type="button" onClick={() => void act()} disabled={busy || downloading}>
        {busy || downloading ? <Loader2 size={18} className="animate-spin" /> : ready ? <RefreshCw size={18} /> : <Download size={18} />}
        {downloading ? `${percent}%` : ready ? 'Перезапустить и обновить' : state.status === 'error' ? 'Повторить проверку' : 'Скачать обновление'}
      </button>
      {downloading && <div className="launcher-update-banner-progress" role="progressbar" aria-label="Скачивание обновления" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100}><span style={{ width: `${percent}%` }} /></div>}
    </section>
  );
}
