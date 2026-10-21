import { useState } from 'react';
import type { BackgroundSetting } from '@quiby/shared';
import { ImagePlus } from 'lucide-react';

export function BackgroundPicker({ label, value, onChange }: { label: string; value?: BackgroundSetting; onChange: (setting: BackgroundSetting) => void }) {
  const [busy, setBusy] = useState(false), [error, setError] = useState('');
  const choose = async () => {
    setBusy(true); setError('');
    try { const imageId = await window.quibyApi.selectBackground(); if (imageId) onChange({ mode: 'custom', imageId }); }
    catch (error) { setError(error instanceof Error ? error.message : 'Не удалось выбрать фон.'); }
    finally { setBusy(false); }
  };
  return <div className="background-setting"><div><strong>{label}</strong><p>Свой GIF, PNG, JPEG или WebP до 50 МБ. Оригинальное качество.</p></div>
    <div className="background-options" role="group" aria-label={label}>
      <button type="button" className="ui-button" disabled={busy} aria-pressed={!value || value.mode === 'default'} onClick={() => onChange({ mode: 'default' })}>Исходный</button>
      <button type="button" className="ui-button" disabled={busy} aria-pressed={value?.mode === 'custom'} onClick={() => void choose()}><ImagePlus size={15}/>{busy ? 'Открываем…' : 'Свой фон'}</button>
      <button type="button" className="ui-button" disabled={busy} aria-pressed={value?.mode === 'none'} onClick={() => onChange({ mode: 'none' })}>Без фона</button>
    </div>{error && <p className="inline-error" role="alert">{error}</p>}</div>;
}
