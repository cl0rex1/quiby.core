import { useEffect, useId, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronDown } from 'lucide-react';

export function SelectMenu({ label, value, options, onChange, icon, className = '' }: {
  label: string; value: string; options: readonly { value: string; label: string }[];
  onChange: (value: string) => void; icon?: ReactNode; className?: string;
}) {
  const [open, setOpen] = useState(false);
  const selected = Math.max(0, options.findIndex(option => option.value === value));
  const [active, setActive] = useState(selected);
  const [position, setPosition] = useState({ left: 0, top: 0, width: 188, maxHeight: 260 });
  const trigger = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLDivElement>(null);
  const typeahead = useRef({ value: '', time: 0 });
  const id = useId();
  const choose = (index: number) => { if (options[index]) onChange(options[index].value); setOpen(false); };

  useLayoutEffect(() => {
    if (!open) return;
    const reposition = () => {
      const rect = trigger.current!.getBoundingClientRect();
      const height = Math.min(260, options.length * 36 + 10);
      const below = innerHeight - rect.bottom - 12;
      const above = rect.top - 12;
      const useBelow = below >= height || below >= above;
      const maxHeight = Math.max(40, Math.min(height, useBelow ? below : above));
      const width = Math.min(Math.max(188, rect.width), innerWidth - 16);
      setPosition({ left: Math.max(8, Math.min(rect.left, innerWidth - width - 8)), top: useBelow ? rect.bottom + 6 : Math.max(8, rect.top - maxHeight - 6), width, maxHeight });
    };
    reposition();
    window.addEventListener('resize', reposition);
    const scroll = (event: Event) => { if (!menu.current?.contains(event.target as Node)) reposition(); };
    document.addEventListener('scroll', scroll, true);
    return () => { window.removeEventListener('resize', reposition); document.removeEventListener('scroll', scroll, true); };
  }, [open, options.length]);
  useEffect(() => {
    if (!open) return;
    const outside = (event: PointerEvent) => {
      if (!trigger.current?.contains(event.target as Node) && !menu.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', outside);
    return () => document.removeEventListener('pointerdown', outside);
  }, [open]);
  useEffect(() => { if (open) menu.current?.children[active]?.scrollIntoView({ block: 'nearest' }); }, [active, open]);

  return <>
    <button ref={trigger} type="button" role="combobox" aria-label={label} aria-expanded={open} aria-controls={open ? id : undefined}
      aria-haspopup="listbox" aria-activedescendant={open ? `${id}-${active}` : undefined}
      className={`select-menu ${className}`} title={options[selected]?.label}
      onClick={() => { setActive(selected); setOpen(!open); }} onBlur={() => setOpen(false)}
      onKeyDown={event => {
        if (event.key === 'Escape') { if (open) event.stopPropagation(); setOpen(false); return; }
        if (event.key === 'Tab') { setOpen(false); return; }
        if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
          event.preventDefault();
          const next = event.key === 'Home' ? 0 : event.key === 'End' ? options.length - 1 : Math.max(0, Math.min(options.length - 1, (open ? active : selected) + (event.key === 'ArrowDown' ? 1 : -1)));
          setActive(next); setOpen(true);
        } else if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault(); if (open) choose(active); else { setActive(selected); setOpen(true); }
        } else if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
          const now = performance.now();
          typeahead.current = { value: (now - typeahead.current.time < 700 ? typeahead.current.value : '') + event.key.toLocaleLowerCase(), time: now };
          const found = options.findIndex(option => option.label.toLocaleLowerCase().startsWith(typeahead.current.value));
          if (found >= 0) { setActive(found); setOpen(true); }
        }
      }}>{icon}<span>{options[selected]?.label}</span><ChevronDown size={13}/></button>
    {open && createPortal(<div ref={menu} id={id} role="listbox" aria-label={label} className="select-menu-options" style={position}
      onMouseDown={event => event.preventDefault()}>
      {options.map((option, index) => <div key={option.value} id={`${id}-${index}`} role="option" aria-selected={option.value === value}
        className={index === active ? 'is-active' : ''} onPointerMove={() => setActive(index)} onClick={() => choose(index)}>
        <span>{option.label}</span>{option.value === value && <Check size={14}/>}</div>)}
    </div>, document.body)}
  </>;
}
