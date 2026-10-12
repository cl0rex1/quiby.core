import { useEffect, useRef, useState } from 'react';
import { useMotion } from './MotionProvider';
import { Check, CheckSquare, Copy, Trash2, X, ToggleLeft, ToggleRight } from 'lucide-react';

export function SelectionCheck({ checked, label, onToggle, disabled }: { checked: boolean; label: string; onToggle: () => void; disabled?: boolean }) {
  return <button type="button" disabled={disabled} className={`content-selection-check ${checked ? 'is-selected' : ''}`} role="checkbox" aria-checked={checked} aria-label={label} onClick={event => { event.stopPropagation(); onToggle(); }}><Check size={12} strokeWidth={3} /></button>;
}

export function ContentSelectionDock({ count, total, allSelected, busy, onSelectAll, onClear, onDelete, onCopy, onEnable, onDisable, deleteLabel = 'Удалить' }: {
  count: number; total: number; allSelected: boolean; busy: boolean;
  onSelectAll: () => void; onClear: () => void; onDelete: () => void; onCopy?: () => void;
  onEnable?: () => void; onDisable?: () => void; deleteLabel?: string;
}) {
  const { reduced } = useMotion();
  const [visible, setVisible] = useState(count > 0);
  const lastCount = useRef(count);
  if (count) lastCount.current = count;
  useEffect(() => {
    if (count) { setVisible(true); return; }
    const timer = setTimeout(() => setVisible(false), reduced ? 0 : 180);
    return () => clearTimeout(timer);
  }, [count, reduced]);
  if (!visible && !count) return null;
  return <div className={`content-selection-dock ${!count ? 'is-leaving' : ''}`} aria-hidden={!count} role="toolbar" aria-label="Управление выбранными файлами">
    <div className="content-selection-controls">
      <button type="button" className="content-batch-button" disabled={busy || !count} onClick={onSelectAll} title={allSelected ? 'Снять выбор со всех видимых' : 'Выбрать все видимые'}><CheckSquare size={13} className={allSelected ? 'text-emerald-400' : 'text-zinc-400'} /><span>{count || lastCount.current}/{total}</span></button>
      {onCopy && <button type="button" className="content-batch-button" disabled={busy || !count} onClick={onCopy}><Copy size={14} />Копировать</button>}
      {onEnable && <button type="button" className="content-batch-button" disabled={busy || !count} onClick={onEnable}><ToggleRight size={16}/>Включить</button>}
      {onDisable && <button type="button" className="content-batch-button" disabled={busy || !count} onClick={onDisable}><ToggleLeft size={16}/>Отключить</button>}
      <button type="button" className="content-batch-button delete-action" disabled={busy || !count} onClick={onDelete}><Trash2 size={14} />{deleteLabel}</button>
      <button type="button" className="content-batch-button" disabled={busy || !count} onClick={onClear} aria-label="Снять выделение"><X size={15} /></button>
    </div>
  </div>;
}
