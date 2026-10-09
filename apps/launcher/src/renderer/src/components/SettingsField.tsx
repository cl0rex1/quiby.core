import { useEffect, useState } from 'react';

/** Keep edits local until blur/Enter so partial paths and numbers are never saved. */
export function SettingsField({ value, onCommit, min, max, ...props }: {
  value: string | number;
  onCommit: (value: string) => void;
  min?: number;
  max?: number;
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'min' | 'max'>) {
  const [draft, setDraft] = useState(String(value));
  useEffect(() => setDraft(String(value)), [value]);
  const commit = () => {
    const next = min !== undefined && max !== undefined
      ? draft.trim() && Number.isFinite(Number(draft))
        ? String(Math.min(max, Math.max(min, Math.round(Number(draft))))) : String(value)
      : draft.trim();
    setDraft(next);
    if (next !== String(value)) onCommit(next);
  };
  return <input {...props} min={min} max={max} value={draft}
    onChange={event => setDraft(event.target.value)} onBlur={commit}
    onKeyDown={event => {
      if (event.key === 'Enter') { event.preventDefault(); event.currentTarget.blur(); }
      if (event.key === 'Escape') { event.preventDefault(); setDraft(String(value)); }
    }} />;
}
