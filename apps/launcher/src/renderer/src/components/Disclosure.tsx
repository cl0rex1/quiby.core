import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';

export function Disclosure({ title, children, className = '', open: controlled, onOpenChange }: {
  title: ReactNode; children: ReactNode; className?: string; open?: boolean; onOpenChange?: (open: boolean) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const open = controlled ?? expanded;
  const id = useId();
  const content = useRef<HTMLDivElement>(null);
  useEffect(() => { if (content.current) content.current.inert = !open; }, [open]);
  return <section className={`disclosure ${className} ${open ? 'is-open' : ''}`}>
    <button type="button" className="disclosure-trigger" aria-expanded={open} aria-controls={id}
      onClick={() => { setExpanded(!open); onOpenChange?.(!open); }}>
      <span className="disclosure-title">{title}</span><span className="disclosure-action">{open ? 'Свернуть' : 'Раскрыть'}<ChevronDown size={17}/></span>
    </button>
    <div className="disclosure-grid" aria-hidden={!open}><div ref={content} id={id} className="disclosure-content">{children}</div></div>
  </section>;
}
