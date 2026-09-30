import { Check, CheckSquare, Copy, Trash2, X } from 'lucide-react';

export function SelectionCheck({ checked, label, onToggle }: { checked: boolean; label: string; onToggle: () => void }) {
  return <button type="button" className={`content-selection-check ${checked ? 'is-selected' : ''}`} role="checkbox" aria-checked={checked} aria-label={label} onClick={event => { event.stopPropagation(); onToggle(); }}><Check size={12} strokeWidth={3} /></button>;
}

export function ContentSelectionDock({ count, total, allSelected, busy, onSelectAll, onClear, onDelete, onCopy }: {
  count: number; total: number; allSelected: boolean; busy: boolean;
  onSelectAll: () => void; onClear: () => void; onDelete: () => void; onCopy?: () => void;
}) {
  if (!count) return null;
  return <div className="content-selection-dock" role="toolbar" aria-label="Управление выбранными файлами">
    <div className="flex items-center gap-2 p-1.5 rounded-full bg-surface-900 border border-surface-border shadow-2xl">
      <button type="button" className="content-batch-button" disabled={busy} onClick={onSelectAll} title={allSelected ? 'Снять выбор со всех видимых' : 'Выбрать все видимые'}><CheckSquare size={13} className={allSelected ? 'text-emerald-400' : 'text-zinc-400'} /><span>{count}/{total}</span></button>
      {onCopy && <button type="button" className="content-batch-button" disabled={busy} onClick={onCopy}><Copy size={14} />Копировать</button>}
      <button type="button" className="content-batch-button" disabled={busy} onClick={onDelete} title="Переместить выбранные в корзину"><Trash2 size={14} />В корзину</button>
      <button type="button" className="content-batch-button" disabled={busy} onClick={onClear} aria-label="Снять выделение"><X size={15} /></button>
    </div>
  </div>;
}
