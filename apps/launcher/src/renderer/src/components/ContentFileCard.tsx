import { useId, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { AlertCircle, ExternalLink, MoreHorizontal, Trash2 } from 'lucide-react';
import { ModIcon } from './ModIcon';
import { SelectionCheck } from './ContentSelectionDock';

interface ContentFileCardProps {
  fileId: string;
  name: string;
  description: string;
  iconUrl?: string;
  projectUrl?: string;
  filename: string;
  size: string;
  notice?: string;
  tone?: 'warning' | 'danger';
  reason?: string;
  icon?: ReactNode;
  enabled?: boolean;
  busy?: boolean;
  selected?: boolean;
  onSelect?: () => void;
  onToggle?: () => void;
  onDelete?: () => void;
  deleteLabel?: string;
  children?: ReactNode;
}

export function ContentFileCard({ fileId, name, description, iconUrl, projectUrl, filename, size, notice, tone = 'warning', reason,
  icon, enabled, busy, selected, onSelect, onToggle, onDelete, deleteLabel = 'Удалить', children }: ContentFileCardProps) {
  const [expanded, setExpanded] = useState(false);
  const detailsId = useId();
  const trigger = useRef<HTMLButtonElement>(null);
  const details = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => { if (details.current) details.current.inert = !expanded; }, [expanded]);

  return <article data-file-id={fileId} className={`content-file-card mod-card ${selected ? 'is-selected' : ''} ${expanded ? 'is-expanded' : ''} ${onToggle && enabled === false ? 'is-disabled' : ''}`}
    aria-label={name} onKeyDown={event => {
      if (event.key === 'Escape' && expanded) { event.stopPropagation(); setExpanded(false); trigger.current?.focus(); }
    }}>
    <div className="mod-card-main">
      <div className="mod-card-icon">
        {icon ? <div className="library-file-icon">{icon}</div> : <ModIcon src={iconUrl} name={name}/>}
        {onSelect && <SelectionCheck disabled={busy} checked={Boolean(selected)} onToggle={onSelect} label={`Выделить ${filename}`}/>}
      </div>
      <div className="mod-card-copy"><div className="file-card-title"><h2 title={name}>{name}</h2>
        {notice && <span className={`file-card-notice is-${tone}`} role="img" aria-label={notice} title={notice}><AlertCircle size={14}/></span>}
      </div><p title={description}>{description}</p></div>
      <button ref={trigger} type="button" className="mod-card-more" aria-label={`Подробнее: ${name}`} title="Сведения и действия"
        aria-expanded={expanded} aria-controls={detailsId} onClick={() => setExpanded(previous => !previous)}><MoreHorizontal size={18}/></button>
    </div>
    <div className="mod-card-footer">
      <span className="mod-card-size">{size}</span>
      {onToggle && <button type="button" role="switch" aria-checked={Boolean(enabled)} aria-label={`${enabled ? 'Отключить' : 'Включить'} ${name}`}
        title={busy ? 'Доступно после завершения текущей операции или игры' : 'Применится при следующем запуске игры'}
        className="mod-card-switch" disabled={busy} onClick={onToggle}><span/></button>}
    </div>
    {children && <div className="mod-card-review">{children}</div>}
    <div className="mod-card-details-grid" aria-hidden={!expanded}><div ref={details} id={detailsId} className="mod-card-details-clip"><div className="mod-card-details">
      <p className="mod-card-filename">{filename}</p>
      {notice && <p>{notice}{reason && ` · ${reason}`}</p>}
      <div className="mod-card-actions">
        {projectUrl && <a href={projectUrl} target="_blank" rel="noreferrer"><ExternalLink size={13}/>Страница мода</a>}
        {onDelete && <button type="button" className="delete-action" disabled={busy} onClick={onDelete}><Trash2 size={13}/>{deleteLabel}</button>}
      </div>
    </div></div></div>
  </article>;
}
