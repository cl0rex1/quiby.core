import { useState, type ReactNode } from 'react';
import { CheckSquare, FolderOpen, Grid2X2, List, Loader2, Plus, RefreshCw, Search, X } from 'lucide-react';

export type ContentViewMode = 'grid' | 'list';
export function useContentView(category: string): [ContentViewMode, (mode: ContentViewMode) => void] {
  const key = `quiby_content_view_${category}`;
  const [mode, setMode] = useState<ContentViewMode>(() => {
    try { return localStorage.getItem(key) === 'list' ? 'list' : 'grid'; } catch { return 'grid'; }
  });
  return [mode, next => { setMode(next); try { localStorage.setItem(key, next); } catch { /* Still works without storage. */ } }];
}

export function SelectAllButton({ allSelected, count, disabled, onClick }: { allSelected: boolean; count: number; disabled?: boolean; onClick: () => void }) {
  return <button type="button" className={`ui-button content-select-all ${allSelected ? 'is-selected' : ''}`} disabled={disabled || !count} onClick={onClick}>
    <CheckSquare size={14} /><span>{allSelected ? 'Снять выбор' : 'Выбрать все'}</span>
  </button>;
}

export function ContentToolbar({ label, total, visible = total, mode, onMode, selection, busy = false, refreshing = false, onAdd, onFolder, onRefresh, children }: {
  label: string; total: number; visible?: number; mode: ContentViewMode; onMode: (mode: ContentViewMode) => void;
  selection?: { allSelected: boolean; onSelectAll: () => void; count?: number }; busy?: boolean; refreshing?: boolean;
  onAdd?: () => void; onFolder: () => void; onRefresh?: () => void; children?: ReactNode;
}) {
  return <div className="content-toolbar">
    <div className="content-toolbar-summary">
      {children}
      <div className="library-count">{label}<span aria-label={`Показано ${visible} из ${total}`}>{visible === total ? total : `${visible}/${total}`}</span></div>
      {selection && <SelectAllButton count={selection.count ?? visible} allSelected={selection.allSelected} disabled={busy} onClick={selection.onSelectAll} />}
    </div>
    <div className="toolbar-actions">
      <div className="content-view-toggle" role="group" aria-label="Вид отображения">
        <button type="button" title="Плитки" aria-label="Плитки" aria-pressed={mode === 'grid'} onClick={() => onMode('grid')}><Grid2X2 size={16}/></button>
        <button type="button" title="Список" aria-label="Список" aria-pressed={mode === 'list'} onClick={() => onMode('list')}><List size={16}/></button>
      </div>
      {onAdd && <button type="button" className="ui-button is-primary" disabled={busy} onClick={onAdd}><Plus size={14}/>Добавить файл</button>}
      <button type="button" className="ui-button" disabled={busy} onClick={onFolder}><FolderOpen size={14}/>Открыть папку</button>
      {onRefresh && <button type="button" className="ui-button content-refresh" disabled={busy || refreshing} onClick={onRefresh} title="Обновить список" aria-label="Обновить список">{refreshing ? <Loader2 size={14} className="animate-spin"/> : <RefreshCw size={14}/>}</button>}
    </div>
  </div>;
}

export function ContentSearch({ value, onChange, label, hint }: { value: string; onChange: (value: string) => void; label: string; hint?: string }) {
  return <div className="content-search"><Search size={15}/><input aria-label={label} value={value} onChange={event => onChange(event.target.value)} placeholder="Найти по названию или имени файла"/>
    {value && <button type="button" aria-label="Очистить поиск" onClick={() => onChange('')}><X size={14}/></button>}{hint && <span>{hint}</span>}
  </div>;
}
